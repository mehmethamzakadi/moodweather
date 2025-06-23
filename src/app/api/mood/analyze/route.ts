// src/app/api/mood/analyze/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { WeatherAPI, WeatherData } from "@/lib/weather/api"

// Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1024,
    responseMimeType: "application/json"
  }
})

// Mood analizi için JSON schema tanımı
interface MoodAnalysisResponse {
  moodAnalysis: string
  targetMood: string
  moodScore: number
  musicStrategy: string
  playlistTheme: string
  recommendedGenres: string[]
  energyLevel: "low" | "medium" | "high"
  valence: "negative" | "neutral" | "positive"
  recommendations: string[]
  personalizedInsight: string
  musicMoodConnection: string
  actionPlan: string[]
  weatherInfluence?: string
  timeInfluence?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Request body'yi parse et - weather eklendi
    const { mood, location, weather } = await request.json()

    if (!mood || mood.trim().length < 3) {
      return NextResponse.json(
        { error: "Mood bilgisi en az 3 karakter olmalı" },
        { status: 400 }
      )
    }

    console.log('🧠 Mood analizi başlatılıyor...', { mood, location, hasWeather: !!weather })

    // JWT session'dan user bilgilerini al
    const userEmail = session.user.email!
    const userName = session.user.name || 'Spotify User'
    const spotifyId = (session as { spotifyId?: string }).spotifyId

    // User işlemleri
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      console.log('👤 Mevcut user bulundu:', userId)
    } else {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: userEmail,
          name: userName,
          spotify_id: spotifyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError || !newUser) {
        console.error('User create error:', createError)
        throw new Error('Kullanıcı oluşturulamadı')
      }

      userId = newUser.id
      console.log('🆕 Yeni user oluşturuldu:', userId)
    }

    // ÇEVRESEL ETKİLERİ DIŞARDA TANIMLA (try-catch'ten önce)
    let weatherContext = ""
    let timeContext = ""
    const environmentalModifiers = {
      energyBoost: 0,
      valenceBoost: 0,
      recommendations: [] as string[]
    }

    // Hava durumu ve zaman etkilerini hesapla
    if (weather) {
      const moodFactor = WeatherAPI.calculateMoodFactor(weather as WeatherData)
      environmentalModifiers.energyBoost += moodFactor.energyModifier
      environmentalModifiers.valenceBoost += moodFactor.valenceModifier
      
      // Daha detaylı hava durumu konteksti
      weatherContext = `Mevcut hava durumu: ${weather.temperature}°C ${weather.description}, nem %${weather.humidity}, rüzgar ${weather.windSpeed} km/h. Hava durumu ruh haline etkisi: ${moodFactor.description}`
      environmentalModifiers.recommendations.push(moodFactor.description)
    }

    const timeEffect = WeatherAPI.calculateTimeEffect()
    const seasonEffect = WeatherAPI.calculateSeasonEffect()
    
    environmentalModifiers.energyBoost += timeEffect.energyModifier + seasonEffect.energyModifier
    environmentalModifiers.valenceBoost += timeEffect.valenceModifier + seasonEffect.valenceModifier
    
    timeContext = `Zaman faktörü: ${timeEffect.description}. Mevsimsel etki: ${seasonEffect.description}`
    environmentalModifiers.recommendations.push(timeEffect.description)

    console.log('🌍 Çevresel etkiler:', environmentalModifiers)

    let analysisResult: MoodAnalysisResponse

    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY bulunamadı!')
      throw new Error("Gemini API key bulunamadı")
    }

    try {
      // Geçmiş analizleri al
      const { data: recentSessions } = await supabase
      .from('mood_sessions')
        .select('current_mood, mood_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

      const contextInfo = recentSessions && recentSessions.length > 0 
        ? `Geçmiş analizler: ${recentSessions.map(s => `"${s.current_mood}" (${s.mood_score}/10)`).join(', ')}`
        : ""

      // GELİŞTİRİLMİŞ prompt - hava durumu ve yaratıcı playlist isimleri
      const prompt = `Ruh hali analizi yap ve kesinlikle sadece JSON formatında döndür. Hava durumu verilerini analiz ve strateji kısmında mutlaka kullan.

KULLANICI DURUMU:
Ruh hali: "${mood}"
${weatherContext}
${timeContext}
${contextInfo}

ÖZEL TALİMATLAR:
1. moodAnalysis: Ruh halini VE hava durumu etkisini birlikte analiz et
2. musicStrategy: Hava durumu verilerini müzik stratejisine dahil et
3. playlistTheme: Yaratıcı, konumdan bağımsız, şiirsel isimler kullan (örn: "Gece Üzerine Düşünceler", "Sessiz Anların Müziği", "İç Sesler")
4. Hava durumu verilerini müzik önerilerine yansıt

JSON ÇIKTISI:
{
  "moodAnalysis": "Ruh hali + hava durumu analizi (hava durumu etkisini mutlaka dahil et)",
  "targetMood": "Hedef ruh hali",
  "moodScore": 7,
  "musicStrategy": "Hava durumu faktörlü müzik stratejisi (hava şartlarını stratejiye dahil et)", 
  "playlistTheme": "Yaratıcı, konumdan bağımsız, şiirsel playlist adı",
  "recommendedGenres": ["genre1", "genre2", "genre3"],
  "energyLevel": "medium",
  "valence": "positive",
  "recommendations": ["öneri1", "öneri2", "öneri3"],
  "personalizedInsight": "Kişisel içgörü",
  "musicMoodConnection": "Müzik-duygu-hava bağlantısı",
  "actionPlan": ["adım1", "adım2", "adım3"],
  "weatherInfluence": "Hava durumunun müzik seçimine spesifik etkisi",
  "timeInfluence": "Zaman diliminin etkisi"
}

ÖNEMLİ: Sadece geçerli JSON döndür, hava durumu verilerini analiz ve stratejide kullan!`

      console.log('📤 Gemini AI request gönderiliyor...')

      // Gemini'ye analiz isteği
      const result = await model.generateContent(prompt)
      const response = await result.response
      let aiResponse = response.text().trim()

      console.log('📥 Gemini AI response alındı!')
      
      if (!aiResponse) {
        console.error('❌ Gemini response boş!')
        throw new Error("Gemini'den yanıt alınamadı")
      }

      // JSON'u temizle ve parse et
      try {
        // Code block'ları ve markdown'ı temizle
        aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        
        // JSON başlangıç ve bitiş parantezlerini bul
        const startIndex = aiResponse.indexOf('{')
        const endIndex = aiResponse.lastIndexOf('}')
        
        if (startIndex === -1 || endIndex === -1) {
          throw new Error("JSON format bulunamadı")
        }
        
        const cleanJson = aiResponse.substring(startIndex, endIndex + 1)
        console.log('🧹 Temizlenmiş JSON:', cleanJson.substring(0, 200) + '...')
        
        analysisResult = JSON.parse(cleanJson) as MoodAnalysisResponse
        
        // Validation
        if (!analysisResult.moodAnalysis || !analysisResult.targetMood || 
            typeof analysisResult.moodScore !== 'number') {
          throw new Error("Gemini response eksik alanlar içeriyor")
        }

        // Çevresel etkileri energy/valence'a uygula
        if (environmentalModifiers.energyBoost > 0.2) {
          analysisResult.energyLevel = "high"
        } else if (environmentalModifiers.energyBoost < -0.2) {
          analysisResult.energyLevel = "low"
        }

        if (environmentalModifiers.valenceBoost > 0.2) {
          analysisResult.valence = "positive"
        } else if (environmentalModifiers.valenceBoost < -0.2) {
          analysisResult.valence = "negative"
        }

        // Değer normalizasyonu
        analysisResult.moodScore = Math.max(1, Math.min(10, Math.round(analysisResult.moodScore)))

        // Array olmayan alanları düzelt
        if (!Array.isArray(analysisResult.recommendedGenres)) {
          analysisResult.recommendedGenres = ["ambient", "chill", "acoustic"]
        }
        if (!Array.isArray(analysisResult.recommendations)) {
          analysisResult.recommendations = ["Müziği keşfedin", "Anı yaşayın", "Duygularınızı dinleyin"]
        }
        if (!Array.isArray(analysisResult.actionPlan)) {
          analysisResult.actionPlan = ["Müzik dinleyin", "Nefes alın", "Kendinizi hissedin"]
        }

        console.log('✨ Analiz başarıyla tamamlandı:', {
          moodScore: analysisResult.moodScore,
          energyLevel: analysisResult.energyLevel,
          valence: analysisResult.valence
        })

      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError)
        console.error('❌ Ham response:', aiResponse)
        throw new Error("Gemini'den geçerli JSON formatı alınamadı")
      }

    } catch (geminiError) {
      console.error('🚨 Gemini AI hatası:', geminiError)
      
      // Enhanced fallback - ENVIRONMENTAL MODIFIERS ARTIK ERİŞİLEBİLİR
      const creativeThemes = [
        "Sessiz Anların Müziği",
        "İç Sesler ve Yankılar", 
        "Düşüncelerin Melodisi",
        "Huzurun Ritmi",
        "Duygusal Yolculuk",
        "Anın Sesi",
        "Kalbin Müziği",
        "Ruhsal Dengeleme"
      ]
      
      const fallbackScore = 5
      let fallbackEnergy: "low" | "medium" | "high" = "medium"
      let fallbackValence: "negative" | "neutral" | "positive" = "neutral"
      
      // Çevresel etkilerle fallback'i ayarla
      if (weather) {
        const moodFactor = WeatherAPI.calculateMoodFactor(weather as WeatherData)
        if (moodFactor.energyModifier > 0.1) fallbackEnergy = "high"
        else if (moodFactor.energyModifier < -0.1) fallbackEnergy = "low"
        
        if (moodFactor.valenceModifier > 0.1) fallbackValence = "positive"
        else if (moodFactor.valenceModifier < -0.1) fallbackValence = "negative"
      }
      
      analysisResult = {
        moodAnalysis: `"${mood}" ruh haliniz${weather ? `, ${weather.temperature}°C ${weather.description} hava koşulları` : ''} ile birleşerek özel bir müzikal atmosfer yaratıyor.`,
        targetMood: "Dengeli ve uyumlu",
        moodScore: fallbackScore,
        musicStrategy: `Ruh haliniz${weather ? ` ve mevcut hava şartları (${weather.temperature}°C, ${weather.description})` : ''} göz önüne alınarak müzik stratejisi geliştiriliyor.`,
        playlistTheme: creativeThemes[Math.floor(Math.random() * creativeThemes.length)],
        recommendedGenres: ["ambient", "chill", "acoustic"],
        energyLevel: fallbackEnergy,
        valence: fallbackValence,
        recommendations: ["Müziğin iyileştirici gücüne güvenin", "Anın keyfini çıkarın", "Duygularınızı dinleyin"],
        personalizedInsight: "Ruh haliniz ve çevresel faktörler müzikal deneyiminizi zenginleştiriyor.",
        musicMoodConnection: "Müzik, iç dünyanızla dış dünya arasında köprü görevi görüyor.",
        actionPlan: ["Derin nefes alın", "Müziğe odaklanın", "Bu anı kucaklayın"],
        weatherInfluence: weather ? WeatherAPI.calculateMoodFactor(weather as WeatherData).description : "Çevresel faktörler müzik deneyiminizi destekliyor",
        timeInfluence: WeatherAPI.calculateTimeEffect().description
      }
      
      console.log('🔄 Fallback kullanıldı')
    }

    // Supabase'e session kaydet - analysis'e hava durumu verilerini dahil et
    const enhancedAnalysis = {
      ...analysisResult,
      environmentalContext: {
        weather: weather,
        location: location,
        energyModifier: environmentalModifiers.energyBoost,
        valenceModifier: environmentalModifiers.valenceBoost
      }
    }

    const sessionData = {
      user_id: userId,
      current_mood: mood.substring(0, 500),
      target_mood: analysisResult.targetMood.substring(0, 200),
      mood_score: analysisResult.moodScore,
      location: location,
      ai_analysis: JSON.stringify(enhancedAnalysis),
      playlist_strategy: analysisResult.musicStrategy.substring(0, 500),
      session_date: new Date().toISOString()
    }
    
    const { data: moodSession, error: insertError } = await supabase
      .from('mood_sessions')
      .insert(sessionData)
      .select()
      .single()
      
    if (insertError) {
      console.error('Database error:', insertError)
      return NextResponse.json({
        success: true,
        sessionId: 'fallback_' + Date.now(),
        analysis: analysisResult,
        message: "Analiz tamamlandı ama session kaydedilemedi",
        aiPowered: true,
        provider: "gemini"
      })
    }
    
    const sessionId = moodSession?.id || 'fallback_' + Date.now()
    console.log('💾 Session created:', sessionId)
    
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      analysis: analysisResult,
      message: "Hava durumu destekli AI analiz tamamlandı",
      aiPowered: true,
      provider: "gemini",
      weatherEnhanced: !!weather
    })

  } catch (error) {
    console.error('💥 Analiz hatası:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    return NextResponse.json(
      { 
        error: "Analiz sırasında bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}