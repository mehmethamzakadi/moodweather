// src/app/api/mood/analyze/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

// AI metnini parse etmek için helper function
function parseGroqResponse(aiText: string, originalMood: string) {
  // Varsayılan değerler
  let analysisResult = {
    moodAnalysis: aiText, // Tam metni al, kesme
    targetMood: "Daha iyi hissetmek",
    moodScore: 5,
    musicStrategy: "Ruh halinizi iyileştirecek müzikler",
    playlistTheme: "Kişiselleştirilmiş Mix",
    recommendedGenres: ["pop", "acoustic", "chill"] as string[],
    energyLevel: "medium",
    valence: "neutral",
    recommendations: [] as string[]
  }

  const textLower = aiText.toLowerCase()

  // Mood Score'u çıkar (8/10, 7, vs.)
  const scoreMatch = aiText.match(/(\d+)(?:\/10|\/10|\/\d+|\s*\/?\s*10)?/);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1]);
    if (score >= 1 && score <= 10) {
      analysisResult.moodScore = score;
    }
  }

  // Target Mood'u çıkar
  const targetMatches = [
    /hedeflenen ruh hal[iı][\s:]*([^.\n]+)/i,
    /target mood[\s:]*([^.\n]+)/i,
    /amaç[\s:]*([^.\n]+)/i
  ];
  
  for (const regex of targetMatches) {
    const match = aiText.match(regex);
    if (match && match[1]) {
      analysisResult.targetMood = match[1].trim();
      break;
    }
  }

  // Müzik türlerini çıkar
  const genreKeywords = {
    'pop': /\bpop\b/i,
    'rock': /\brock\b/i,
    'electronic': /\belectronic\b|\belektronik\b/i,
    'dance': /\bdance\b|\bdans\b/i,
    'hip-hop': /\bhip.?hop\b|\brap\b/i,
    'acoustic': /\bacoustic\b|\bakustik\b/i,
    'classical': /\bclassical\b|\bklasik\b/i,
    'jazz': /\bjazz\b/i,
    'ambient': /\bambient\b|\batmosfer\b/i,
    'chill': /\bchill\b|\bsakin\b/i,
    'indie': /\bindie\b/i
  };

  const foundGenres: string[] = [];
  for (const [genre, regex] of Object.entries(genreKeywords)) {
    if (regex.test(aiText)) {
      foundGenres.push(genre);
    }
  }
  
  if (foundGenres.length > 0) {
    analysisResult.recommendedGenres = foundGenres.slice(0, 4);
  }

  // Enerji seviyesini belirle
  if (textLower.includes('yüksek') || textLower.includes('high') || textLower.includes('enerjik')) {
    analysisResult.energyLevel = "high";
  } else if (textLower.includes('düşük') || textLower.includes('low') || textLower.includes('sakin')) {
    analysisResult.energyLevel = "low";
  }

  // Valence'ı belirle
  if (textLower.includes('pozitif') || textLower.includes('positive') || textLower.includes('mutlu')) {
    analysisResult.valence = "positive";
  } else if (textLower.includes('negatif') || textLower.includes('negative') || textLower.includes('üzgün')) {
    analysisResult.valence = "negative";
  }

  // Playlist temasını güncelle
  if (analysisResult.energyLevel === "high" && analysisResult.valence === "positive") {
    analysisResult.playlistTheme = "Enerjik ve Pozitif";
  } else if (analysisResult.energyLevel === "low" && analysisResult.valence === "positive") {
    analysisResult.playlistTheme = "Sakin ve Huzurlu";
  } else if (analysisResult.valence === "negative") {
    analysisResult.playlistTheme = "Destekleyici ve İyileştirici";
  }

  // Önerileri çıkar (1., 2., 3. ile başlayan satırlar)
  const recommendationMatches = aiText.match(/(?:\d+\.|\*\*Öneri \d+\*\*|\*\*Tavsiye \d+\*\*)([^.\n]+(?:\.[^.\n]*)?)/gi);
  if (recommendationMatches && recommendationMatches.length > 0) {
    analysisResult.recommendations = recommendationMatches
      .slice(0, 3)
      .map(rec => rec.replace(/^\d+\.|\*\*[^*]+\*\*|\*/g, '').trim())
      .filter(rec => rec.length > 10);
  }

  // Eğer öneriler bulunamadıysa fallback
  if (analysisResult.recommendations.length === 0) {
    analysisResult.recommendations.push(`Bu mood için ${analysisResult.recommendedGenres[0]} tarzı müzikler öneriyorum`);
    analysisResult.recommendations.push("Müzik eşliğinde derin nefes alın");
    analysisResult.recommendations.push("Kendinize zaman ayırın ve müziğin tadını çıkarın");
  }

  // Müzik stratejisini AI metninden çıkar veya oluştur
  const strategyMatch = aiText.match(/müzik stratej[iı][\s:]*([^.\n]+)/i);
  if (strategyMatch && strategyMatch[1]) {
    analysisResult.musicStrategy = strategyMatch[1].trim();
  } else {
    analysisResult.musicStrategy = `${originalMood} ruh haliniz için özel seçilmiş ${analysisResult.recommendedGenres.join(', ')} müzikleri`;
  }

  return analysisResult;
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

    console.log('Groq AI analizi başlatılıyor...', { mood, location })

    let analysisResult

    // Groq API key kontrolü
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Groq API key bulunamadı")
    }

    try {
      // Groq AI ile mood analizi (düz metin istiyoruz, JSON değil)
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Sen bir müzik terapi uzmanısın. Kullanıcının ruh haline göre detaylı analiz yap ve müzik önerileri ver.

Analizinde şunları içer:
- Kullanıcının ruh halinin detaylı analizi 
- Hedeflenen ruh hali (örn: "Enerjiyi artırmak")
- Mood skoru (1-10 arası sayı)
- Müzik stratejisi açıklaması
- Önerilen müzik türleri (pop, rock, electronic, vs.)
- Enerji seviyesi (yüksek/orta/düşük)
- 3 adet pratik öneri (müzik, aktivite, genel wellbeing)

Türkçe, empatik ve destekleyici bir dil kullan. Her analizi kişiselleştir.`
          },
          {
            role: "user",
            content: `Kullanıcının ruh hali: "${mood}"
Konum: ${location || "Bilinmiyor"}

Bu ruh halini analiz et ve müzik terapi önerileri ver.`
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 1000,
      })

      const aiResponse = completion.choices[0]?.message?.content
      if (!aiResponse) {
        throw new Error("AI'dan yanıt alınamadı")
      }

      console.log('Groq AI response alındı:', aiResponse.substring(0, 200) + '...')

      // AI metnini parse et
      analysisResult = parseGroqResponse(aiResponse, mood)
      
      console.log('Parse edilen analiz:', {
        moodScore: analysisResult.moodScore,
        energyLevel: analysisResult.energyLevel,
        valence: analysisResult.valence,
        genreCount: analysisResult.recommendedGenres.length
      })

    } catch (groqError) {
      console.error('Groq AI hatası:', groqError)
      
      // Fallback analiz
      const moodLower = mood.toLowerCase()
      let moodScore = 5
      let energyLevel = "medium"
      let valence = "neutral"
      
      if (moodLower.includes('mutlu') || moodLower.includes('heyecan') || moodLower.includes('enerjik')) {
        moodScore = 8
        energyLevel = "high"
        valence = "positive"
      } else if (moodLower.includes('sakin') || moodLower.includes('huzur')) {
        moodScore = 7
        energyLevel = "low"
        valence = "positive"
      } else if (moodLower.includes('üzgün') || moodLower.includes('kötü')) {
        moodScore = 3
        energyLevel = "low"
        valence = "negative"
      }
      
      analysisResult = {
        moodAnalysis: `${mood} şeklinde hissediyorsunuz. Bu ruh halinizi destekleyecek müzik önerileri hazırladık.`,
        targetMood: "Daha iyi hissetmek",
        moodScore,
        musicStrategy: "Ruh halinizi destekleyecek özel müzik seçimi",
        playlistTheme: "Kişiselleştirilmiş Mix",
        recommendedGenres: ["pop", "acoustic", "chill"],
        energyLevel,
        valence,
        recommendations: [
          "Sevdiğiniz müzikleri dinleyerek rahatlayın",
          "Müzik eşliğinde derin nefes alın",
          "Kendinize zaman ayırın"
        ]
      }
      
      console.log('Fallback analysis kullanıldı')
    }

    // Veritabanına mood session kaydet
    const moodSession = await prisma.moodSession.create({
      data: {
        userId: user.id,
        currentMood: mood.substring(0, 500), // Bu field kısa olabilir
        targetMood: analysisResult.targetMood.substring(0, 200),
        moodScore: analysisResult.moodScore,
        location: location,
        aiAnalysis: JSON.stringify(analysisResult), // JSON olarak sakla
        playlistStrategy: analysisResult.musicStrategy.substring(0, 500),
      },
    })

    console.log('Mood session created:', moodSession.id)

    // Response döndür
    return NextResponse.json({
      success: true,
      sessionId: moodSession.id,
      analysis: analysisResult,
      message: "Mood analizi başarıyla tamamlandı"
    })

  } catch (error) {
    console.error('Mood analiz hatası:', error)
    
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