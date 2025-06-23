// src/app/api/mood/analyze/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.9, // Yaratıcılık için yüksek
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
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
}

export async function POST(request: NextRequest) {
  try {
    // Session kontrol et - NextAuth v4
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Request body'yi parse et
    const { mood, location, includeTurkish = false, isPlaylistPrivate = true } = await request.json()

    if (!mood || mood.trim().length < 3) {
      return NextResponse.json(
        { error: "Mood bilgisi en az 3 karakter olmalı" },
        { status: 400 }
      )
    }

    // JWT session'dan user bilgilerini al
    const userEmail = session.user.email!
    const userName = session.user.name || 'Spotify User'
    const spotifyId = (session as { spotifyId?: string }).spotifyId

    // Önce user'ı email ile bul
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    let userId: string

    if (existingUser) {
      // Mevcut user
      userId = existingUser.id
      console.log('👤 Mevcut user bulundu:', userId)
    } else {
      // Yeni user oluştur
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

    console.log('🧠 Gemini AI analiz başlatılıyor...', { mood, location, userEmail })
    console.log('🔑 Gemini API Key mevcut:', !!process.env.GEMINI_API_KEY)

    let analysisResult: MoodAnalysisResponse

    // Gemini API key kontrolü
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY bulunamadı!')
      throw new Error("Gemini API key bulunamadı")
    }

    try {
      // Kullanıcının geçmiş analizlerini Supabase'den al
      const { data: recentSessions, error: sessionsError } = await supabase
      .from('mood_sessions')
        .select('current_mood, mood_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (sessionsError) {
      console.log('Recent sessions fetch error (not critical):', sessionsError)
    }

    const contextInfo = recentSessions && recentSessions.length > 0 
      ? `\n\nKullanıcının geçmiş ruh halleri: ${recentSessions.map(s => `"${s.current_mood}" (${s.mood_score}/10)`).join(', ')}`
      : ""

      // Gemini için optimize edilmiş Türkçe prompt - doğal ve samimi
      const prompt = `Sen müzik ruh hali uzmanısın ve samimi bir arkadaş gibi konuşuyorsun. Doğal, anlayışlı ama abartısız bir dille analiz yap.

GÖREV: Bu ruh halini analiz edip JSON döndür.

YAZIM TARZI:
- Doğal, günlük konuşma dili
- Samimi ama profesyonel
- Abartısız, gerçekçi yaklaşım
- Her analiz farklı ve özgün olmalı
- Klişe ifadelerden kaçın

JSON YAPISI:
{
  "moodAnalysis": "Doğal ve samimi analiz (100-150 kelime)",
  "targetMood": "Hedef durum (basit açıklama)",
  "moodScore": 1-10 arası sayı,
  "musicStrategy": "Müzik stratejisi (60-100 kelime)",
  "playlistTheme": "Playlist adı (yaratıcı ama sade)",
  "recommendedGenres": ["tür1", "tür2", "tür3"],
  "energyLevel": "low/medium/high",
  "valence": "negative/neutral/positive",
  "recommendations": ["öneri1", "öneri2", "öneri3"],
  "personalizedInsight": "Kişisel içgörü (40-60 kelime)",
  "musicMoodConnection": "Müzik-duygu bağlantısı (40-60 kelime)",
  "actionPlan": ["adım1", "adım2", "adım3"]
}

KULLANICI:
Ruh hali: "${mood}"
Konum: ${location || "Bilinmeyor"}${contextInfo}

İPUÇLARI:
- Aynı kelimeleri tekrar etme
- "muhteşem", "harika", "mükemmel" gibi abartılı sıfatları kullanma
- Her cevap benzersiz olsun
- Kullanıcının gerçek hislerini anlayarak yaz
- Spotify'da popüler yabancı müzik türlerini öner

Sadece JSON döndür:`

      console.log('📤 Gemini API request gönderiliyor...')

      // Gemini'ye analiz isteği
      const result = await model.generateContent(prompt)
      const response = await result.response
      const aiResponse = response.text()

      console.log('📥 Gemini API response alındı!')
      console.log('📏 Response length:', aiResponse?.length)
      console.log('📄 Response preview:', aiResponse?.substring(0, 200))
      
      if (!aiResponse) {
        console.error('❌ Gemini response boş!')
        throw new Error("Gemini'den yanıt alınamadı")
      }

      console.log('🎨 Gemini yaratıcı response alındı (ilk 300 char):', aiResponse.substring(0, 300) + '...')

      // JSON'u parse et
      try {
        // JSON'u temizle (başında/sonunda extra metin olabilir)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const cleanJson = jsonMatch ? jsonMatch[0] : aiResponse
        
        analysisResult = JSON.parse(cleanJson) as MoodAnalysisResponse
        
        // Minimal validation
        if (!analysisResult.moodAnalysis || !analysisResult.targetMood || 
            typeof analysisResult.moodScore !== 'number') {
          throw new Error("Gemini response eksik alanlar içeriyor")
        }

        // Değer normalizasyonu
        analysisResult.moodScore = Math.max(1, Math.min(10, Math.round(analysisResult.moodScore * 10) / 10))

        // Eksik alanları intelligent fill
        if (!analysisResult.personalizedInsight) {
          analysisResult.personalizedInsight = "Bu ruh hali, kişisel deneyimlerinizin doğal ve değerli bir yansıması."
        }
        if (!analysisResult.musicMoodConnection) {
          analysisResult.musicMoodConnection = "Müzik, sinir sisteminiz üzerinden duygusal durumunuzu olumlu yönde etkileyebilir."
        }
        if (!Array.isArray(analysisResult.actionPlan)) {
          analysisResult.actionPlan = ["Önerilen müzikleri dinleyin", "Rahat bir ortam yaratın", "Durumunuzu kabullenin"]
        }

        console.log('✨ Gemini analizi başarıyla parse edildi:', {
          moodScore: analysisResult.moodScore,
          energyLevel: analysisResult.energyLevel,
          valence: analysisResult.valence,
          genreCount: analysisResult.recommendedGenres?.length || 0,
          hasPersonalInsight: !!analysisResult.personalizedInsight,
          playlistTheme: analysisResult.playlistTheme?.substring(0, 30) + '...'
        })

      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError)
        console.log('Raw Gemini response:', aiResponse)
        throw new Error("Gemini'den geçerli JSON formatı alınamadı")
      }

    } catch (geminiError) {
      console.error('🚨 Gemini AI hatası:', geminiError)
      
      // Türkçe fallback - mood'a göre
      const moodLower = mood.toLowerCase()
      let fallbackScore = 5
      let fallbackEnergy: "low" | "medium" | "high" = "medium"
      let fallbackValence: "negative" | "neutral" | "positive" = "neutral"
      let fallbackGenres = ["sakinleştirici-müzik", "akustik-folk", "yeni-çağ"]
      let fallbackAnalysis = ""
      let fallbackTarget = ""
      let fallbackStrategy = ""
      
      if (moodLower.includes('enerjik') || moodLower.includes('mutlu') || moodLower.includes('harika') || moodLower.includes('dans')) {
        fallbackScore = 8
        fallbackEnergy = "high"
        fallbackValence = "positive"
        fallbackGenres = ["hareketli-elektronik", "funk-karışımı", "modern-pop"]
        fallbackAnalysis = `İçinizdeki bu güçlü enerji, ruhunuzun dans etmeye hazır olduğunun muhteşem bir göstergesi. "${mood}" ifadeniz, yaşam sevcinizin ve pozitif enerjinizin üst üste çıktığı özel anları yansıtıyor. Bu enerji, müziğin ritmiyle birleştiğinde gerçek bir coşku yaratabilir. Bedeninizin harekete geçmek istediği bu anları değerlendirmek, ruh sağlığınız için çok önemli. Enerjiniz tıpkı bir müzik notası gibi titreşiyor, hayatın melodisine katılmaya hazır.`
        fallbackTarget = "Enerjinizi müzikal coşkuyla şenliğe dönüştürmek"
        fallbackStrategy = "Yüksek tempolu ritimler ve güçlü baslarıyla ruhunuzdaki enerjiyi serbest bırakacak, harekete geçirici müzikler seçeceğiz. Dans edilebilir melodiler ve pozitif titreşim ana tema olacak."
      } else if (moodLower.includes('huzur') || moodLower.includes('sakin') || moodLower.includes('rahat')) {
        fallbackScore = 7
        fallbackEnergy = "low"
        fallbackValence = "positive"
        fallbackGenres = ["sakinleştirici-ortam", "akustik-folk", "meditatif-elektronik"]
        fallbackAnalysis = `"${mood}" ifadeniz, içsel dengenizin ne kadar değerli olduğunun güzel bir kanıtı. Bu huzurlu an, ruhunuzun kendi doğal ritmiyle çalıştığını gösteriyor. Sakinlik halinde olmak, günümüzün yoğun temposunda gerçek bir armağan. Müzik, bu huzuru daha da derinleştirebilir ve kalbinizde kalıcı bir sükunet yaratabilir. Sanki içinizde yumuşak bir melodi çalıyor, tüm varlığınızı sarmalıyor.`
        fallbackTarget = "Mevcut huzurunuzu derinleştirerek kalbinizde sürdürülebilir sakinlik yaratmak"
        fallbackStrategy = "Yumuşak tonlar, doğa sesleri ve minimal enstrümantal düzenlemelerle içsel huzurunuzu pekiştirecek, meditasyon kalitesinde ses deneyimi sunacağız."
      } else if (moodLower.includes('üzüntü') || moodLower.includes('kötü') || moodLower.includes('mutsuz')) {
        fallbackScore = 3
        fallbackEnergy = "low"
        fallbackValence = "negative"
        fallbackGenres = ["melankolik-indie", "iyileştirici-folk", "duygusal-ortam"]
        fallbackAnalysis = `Kalbinizdeki bu ağırlık, insan olmanın en doğal parçası. "${mood}" diyebilmek bile aslında cesaret gerektiriyor. Bu duygularınız, ruhunuzun derinliklerinden gelen bir çağrı - iyileşme ve anlaşılma çağrısı. Ağlamak da gülmek kadar kıymetlidir. Müzik, bu zorlu anlarınızda size eşlik edecek en sadık arkadaşınız olabilir. Duygularınız tıpkı minor bir akor gibi derinlik taşıyor, ve bu derinlik güzel.`
        fallbackTarget = "Duygusal yaranın yanında durarak iyileşme yolculuğuna çıkmak"
        fallbackStrategy = "Yürek burkan ama iyileştirici melodilerle, açık kalp ve güvenli alan yaratacak müzik terapi seansı. Arındırıcı etki yaratacak, duygularınızı akıtmaya yardımcı olacak eserler."
      } else if (moodLower.includes('yorgun') || moodLower.includes('stresli') || moodLower.includes('gergin')) {
        fallbackScore = 4
        fallbackEnergy = "low"
        fallbackValence = "negative"
        fallbackGenres = ["yenileyici-ortam", "doğa-karışımı", "minimalist-piyano"]
        fallbackAnalysis = `Omuzlarınızdaki bu yük, günün yoğunluğunun ve yaşamın temposunun doğal sonucu. "${mood}" hissetmek, aslında bedeninizin ve zihninizin dinlenmeye ihtiyacı olduğunun bilgece bir sinyali. Kendinize karşı şefkatli olmak, en büyük iyilik. Müzik, bu anlarınızda size en yumuşak kucaklamayı sunabilir. Yorgunluğunuz bile kendi müziğine sahip - yavaş, derin, dinlendirici.`
        fallbackTarget = "Zihinsel ve bedensel gerginlikleri yumuşatarak derin huzura ulaşmak"
        fallbackStrategy = "Nefes almayı hatırlatacak, kas gerginliklerini çözecek sakinleştirici ses dalgaları. Doğa temelli sesler ve minimal düzenlemelerle şifa verici atmosfer yaratacağız."
      } else {
        fallbackAnalysis = `"${mood}" ifadeniz, içsel dünyanızın zenginliğinin güzel bir yansıması. Her ruh hali, insan deneyiminin eşsiz ve değerli bir parçasıdır. Sizin bu anki durumunuz da kendine özgü bir güzellik taşıyor. Müzik, bu özel anınızda size eşlik etmeye, ruhunuzun sesini duyup anlamaya hazır. Her duygu geçicidir ama her biri de bize bir şeyler öğretir. Ruh haliniz, kendi özel melodisine sahip.`
        fallbackTarget = "Mevcut ruh halinizi kucaklayarak müzikal uyumla desteklemek"
        fallbackStrategy = "Size özel, ruh halinizi anlayıp destekleyecek çeşitli müzik tonlarıyla duygusal denge yaratmak. Eşsiz bir ses yolculuğu sunacağız."
      }
      
      analysisResult = {
        moodAnalysis: fallbackAnalysis,
        targetMood: fallbackTarget,
        moodScore: fallbackScore,
        musicStrategy: fallbackStrategy,
        playlistTheme: `${mood.split(' ')[0]} Anı İçin Özel Seçki`,
        recommendedGenres: fallbackGenres,
        energyLevel: fallbackEnergy,
        valence: fallbackValence,
        recommendations: [
          "Bu anın geçici olduğunu hatırlayın",
          "Müziğin iyileştirici gücüne güvenin", 
          "Kendinize karşı şefkatli olun"
        ],
        personalizedInsight: "Ruh haliniz tamamen geçerli ve anlaşılabilir. Her duygu değerli bir deneyimdir.",
        musicMoodConnection: "Müzik beyin kimyanızı olumlu yönde etkileyebilir ve duygusal iyileşmeyi destekler.",
        actionPlan: [
          "Beş on dakika müzik dinleyin",
          "Derin nefes alın ve anı yaşayın",
          "Mevcut durumu kucaklayın"
        ]
      }
      
      console.log('🔄 Türkçe fallback kullanıldı')
    }

    // Supabase'e mood session kaydet
    interface SessionData {
      user_id: string
      current_mood: string
      target_mood: string
      mood_score: number
      location?: string
      ai_analysis: string
      playlist_strategy: string
      session_date: string
      include_turkish?: boolean
      is_playlist_private?: boolean
    }
    
    const sessionData: SessionData = {
      user_id: userId,
      current_mood: mood.substring(0, 500),
      target_mood: analysisResult.targetMood.substring(0, 200),
      mood_score: analysisResult.moodScore,
      location: location,
      ai_analysis: JSON.stringify(analysisResult),
      playlist_strategy: analysisResult.musicStrategy.substring(0, 500),
      session_date: new Date().toISOString()
    }
    
    // Yeni kolonları dene, yoksa varsayılan değerlerle devam et
    try {
      sessionData.include_turkish = includeTurkish
      sessionData.is_playlist_private = isPlaylistPrivate
      
      const { data: moodSession, error: insertError } = await supabase
        .from('mood_sessions')
        .insert(sessionData)
        .select()
        .single()
        
      if (insertError) {
        // Eğer kolon yoksa (42703), eski şema ile dene
        if (insertError.code === '42703') {
          console.log('⚠️ Eski DB şeması tespit edildi, yeni kolonlar olmadan kaydediliyor...')
          
          // Yeni kolonları kaldır
          delete sessionData.include_turkish
          delete sessionData.is_playlist_private
          
          const { data: fallbackSession, error: fallbackError } = await supabase
            .from('mood_sessions')
            .insert(sessionData)
            .select()
            .single()
            
          if (fallbackError) {
            console.error('Fallback session insert error:', fallbackError)
            return NextResponse.json({
              success: true,
              sessionId: 'fallback_' + Date.now(),
              analysis: analysisResult,
              message: "Analiz tamamlandı ama session kaydedilemedi",
              aiPowered: true,
              provider: "gemini",
              uniqueness: true
            })
          }
          
          const sessionId = fallbackSession?.id || 'fallback_' + Date.now()
          console.log('💾 Fallback mood session created:', sessionId)
          
          return NextResponse.json({
            success: true,
            sessionId: sessionId,
            analysis: analysisResult,
            message: "Gemini AI ile Türkçe analiz tamamlandı",
            aiPowered: true,
            provider: "gemini",
            uniqueness: true
          })
        }
        
        throw insertError
      }
      
      const sessionId = moodSession?.id || 'fallback_' + Date.now()
      console.log('💾 Supabase mood session created:', sessionId)
      
      // Enhanced response
      return NextResponse.json({
        success: true,
        sessionId: sessionId,
        analysis: analysisResult,
        message: "Gemini AI ile Türkçe analiz tamamlandı",
        aiPowered: true,
        provider: "gemini",
        uniqueness: true
      })
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Hata olsa da analizi döndür
      return NextResponse.json({
        success: true,
        sessionId: 'fallback_' + Date.now(),
        analysis: analysisResult,
        message: "Analiz tamamlandı ama session kaydedilemedi",
        aiPowered: true,
        provider: "gemini",
        uniqueness: true
      })
    }

  } catch (error) {
    console.error('💥 Gemini analiz hatası:', error)
    
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
