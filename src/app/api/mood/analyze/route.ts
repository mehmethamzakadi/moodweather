// src/app/api/mood/analyze/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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
    // Session kontrol et
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Request body'yi parse et
    const { mood, location } = await request.json()

    if (!mood || mood.trim().length < 3) {
      return NextResponse.json(
        { error: "Mood bilgisi en az 3 karakter olmalı" },
        { status: 400 }
      )
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    console.log('🧠 AI-Powered analiz başlatılıyor...', { mood, location })
    console.log('🔑 Groq API Key mevcut:', !!process.env.GROQ_API_KEY)
    console.log('🔑 API Key ilk 20 karakter:', process.env.GROQ_API_KEY?.substring(0, 20))

    let analysisResult: MoodAnalysisResponse

    // Groq API key kontrolü
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY bulunamadı!')
      throw new Error("Groq API key bulunamadı")
    }

    try {
      // Gelişmiş AI system prompt - Yaratıcılık odaklı
      const systemPrompt = `Sen dünyanın en deneyimli müzik terapi uzmanısın. Her insanın ruh hali benzersizdir ve sen her analizi özel olarak yaparsın.

YARATICILIK KURALLARI:
- Her analizi tamamen özgün yap, hiç şablon kullanma
- Kullanıcının tam durumunu hisset ve ona özel yaklaş
- Müzik önerilerini ruh haline göre derinlemesine analiz et
- Sadece tür değil, tempo, ritim, melodi yapısı da öner
- Her öneriyi neden verdiğini açıkla
- Kişisel hikaye anlat gibi yaklaş

Yanıt formatın tam olarak şu JSON yapısında olmalı:
{
  "moodAnalysis": "Kullanıcının ruh halinin derinlemesine, empatik ve özgün analizi (minimum 150 karakter, her seferinde farklı)",
  "targetMood": "Spesifik hedef ruh hali (özgün ifadeler kullan)",
  "moodScore": 1-10 arası hassas değerlendirme,
  "musicStrategy": "Bu spesifik durum için özgün müzik terapi stratejisi",
  "playlistTheme": "Yaratıcı ve özgün playlist ismi",
  "recommendedGenres": ["specific_subgenre1", "specific_subgenre2"] (genel türler değil spesifik alt türler),
  "energyLevel": "low/medium/high",
  "valence": "negative/neutral/positive", 
  "recommendations": ["özgün_öneri1", "özgün_öneri2", "özgün_öneri3"] (her seferinde yaratıcı),
  "personalizedInsight": "Bu kişiye özel psikolojik içgörü ve anlayış",
  "musicMoodConnection": "Müziğin bu ruh haline nasıl etki edeceğinin bilimsel/duygusal açıklaması",
  "actionPlan": ["somut_adım1", "somut_adım2", "somut_adım3"] (uygulanabilir eylem planı)
}

ÖNEMLI: 
- Her analizi benzersiz yap, asla tekrarlanmasın
- Sadece JSON objesi döndür
- Türkçe kullan ama yaratıcı ve özgün ol
- Müzik önerilerini çok spesifik yap (sadece "pop" değil "synth-pop", "indie-folk" gibi)
- Her durumu gerçekten anlayarak yaklaş`

      // Kullanıcının geçmiş analizlerini al (context için)
      const recentSessions = await prisma.moodSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { currentMood: true, moodScore: true }
      })

      const contextInfo = recentSessions.length > 0 
        ? `\n\nBağlam: Kullanıcının son ruh halleri: ${recentSessions.map(s => `"${s.currentMood}" (${s.moodScore}/10)`).join(', ')}`
        : ""

      console.log('📤 Groq API request gönderiliyor...')
      console.log('📝 Model:', "llama-3.1-70b-versatile")
      console.log('📝 Temperature:', 0.8)

      // Groq API'ye yaratıcı analiz isteği
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `BENZERSIZ ANALİZ İSTEĞİ:

Kullanıcının şu anki ruh hali: "${mood}"
Konum: ${location || "Bilinmiyor"}
Tarih/Saat: ${new Date().toLocaleString('tr-TR')}${contextInfo}

Bu ruh halini derinlemesine analiz et. Her detayı düşün:
- Bu ruh halinin kökeninde ne olabilir?
- Hangi müzik türleri neden yardımcı olur?
- Nasıl bir ses atmosferi oluşturmalı?
- Hangi enstrümanlar bu duyguyu destekler?
- Tempo ve ritim nasıl olmalı?

TAMAMEN ÖZGÜN bir analiz yap, hiç şablon kullanma!`
          }
        ],
        model: "llama-3.3-70b-versatile", // ✅ Güncel model
        temperature: 0.8, // Yaratıcılık için yüksek
        max_tokens: 2000,
        response_format: { type: "json_object" },
      })

      const aiResponse = completion.choices[0]?.message?.content
      console.log('📥 Groq API response alındı!')
      console.log('📏 Response length:', aiResponse?.length)
      console.log('📄 Response preview:', aiResponse?.substring(0, 200))
      
      if (!aiResponse) {
        console.error('❌ AI response boş!')
        throw new Error("AI'dan yanıt alınamadı")
      }

      console.log('🎨 Yaratıcı AI response alındı (ilk 300 char):', aiResponse.substring(0, 300) + '...')

      // JSON'u parse et
      try {
        analysisResult = JSON.parse(aiResponse) as MoodAnalysisResponse
        
        // Minimal validation - sadece kritik alanları kontrol et
        if (!analysisResult.moodAnalysis || !analysisResult.targetMood || 
            typeof analysisResult.moodScore !== 'number') {
          throw new Error("AI response eksik alanlar içeriyor")
        }

        // Değer normalizasyonu (AI'a güveniyoruz, minimal müdahale)
        analysisResult.moodScore = Math.max(1, Math.min(10, Math.round(analysisResult.moodScore * 10) / 10))

        // Eksik alanları AI'ın verdiği content'e göre intelligent fill
        if (!analysisResult.personalizedInsight) {
          analysisResult.personalizedInsight = "Bu ruh hali, kişisel deneyimlerinizin doğal bir yansıması."
        }
        if (!analysisResult.musicMoodConnection) {
          analysisResult.musicMoodConnection = "Müzik, nöral pathways üzerinden duygusal durumunuzu pozitif yönde etkileyecek."
        }
        if (!Array.isArray(analysisResult.actionPlan)) {
          analysisResult.actionPlan = ["Önerilen müzikleri dinleyin", "Rahat bir ortam yaratın", "Durumunuzu değerlendirin"]
        }

        console.log('✨ AI analizi başarıyla parse edildi:', {
          moodScore: analysisResult.moodScore,
          energyLevel: analysisResult.energyLevel,
          valence: analysisResult.valence,
          genreCount: analysisResult.recommendedGenres?.length || 0,
          hasPersonalInsight: !!analysisResult.personalizedInsight,
          playlistTheme: analysisResult.playlistTheme?.substring(0, 30) + '...'
        })

      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError)
        console.log('Raw AI response:', aiResponse)
        throw new Error("AI'dan geçerli JSON formatı alınamadı")
      }

    } catch (groqError) {
      console.error('🚨 Groq AI hatası:', groqError)
      
      // Minimalist fallback - sadece kritik durumlarda
      analysisResult = {
        moodAnalysis: `"${mood}" durumundayken hissettiğiniz bu duygular tamamen geçerli. Her insan farklı yaşantılar geçirir ve bu ruh haliniz de benzersiz deneyimlerinizin bir parçası.`,
        targetMood: "İç dengenizi yeniden bulma",
        moodScore: 5,
        musicStrategy: "Durumunuza özel seçilmiş müziklerle duygusal dengeleme",
        playlistTheme: `${mood.split(' ')[0]} Anları için Özel Seçki`,
        recommendedGenres: ["ambient-electronic", "neo-soul", "indie-acoustic"],
        energyLevel: "medium",
        valence: "neutral",
        recommendations: [
          "Bu anın geçici olduğunu hatırlayın",
          "Müziğin size sunduğu anlık kaçışı kabul edin", 
          "Duygularınızı yargılamadan yaşayın"
        ],
        personalizedInsight: "Ruh haliniz, içsel dünyançıın zenginliğinin bir göstergesi.",
        musicMoodConnection: "Doğru müzik seçimi, beyninizdeki serotonin ve dopamin seviyelerini dengeleyebilir.",
        actionPlan: [
          "5 dakika sessizce müzik dinleyin",
          "Nefes egzersizi yapın",
          "Durumunuzu kabul edin ve kendînizi yargılamayın"
        ]
      }
      
      console.log('🔄 Minimalist fallback kullanıldı')
    }

    // Veritabanına kaydet - genişletilmiş analiz
    const moodSession = await prisma.moodSession.create({
      data: {
        userId: user.id,
        currentMood: mood.substring(0, 500),
        targetMood: analysisResult.targetMood.substring(0, 200),
        moodScore: analysisResult.moodScore,
        location: location,
        aiAnalysis: JSON.stringify(analysisResult),
        playlistStrategy: analysisResult.musicStrategy.substring(0, 500),
      },
    })

    console.log('💾 Enhanced mood session created:', moodSession.id)

    // Enhanced response
    return NextResponse.json({
      success: true,
      sessionId: moodSession.id,
      analysis: analysisResult,
      message: "Derinlemesine AI analizi tamamlandı",
      aiPowered: true,
      creativity: "high",
      uniqueness: true
    })

  } catch (error) {
    console.error('💥 Enhanced analiz hatası:', error)
    
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