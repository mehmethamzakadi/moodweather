// src/lib/mood/services.ts
import { GoogleGenerativeAI } from "@google/generative-ai"
import { WeatherAPI, WeatherData } from "@/lib/weather/api"
import { supabase } from "@/lib/supabase"

export interface MoodAnalysisRequest {
  mood: string
  location?: string
  weather?: WeatherData
}

export interface MoodAnalysisResponse {
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

export interface EnvironmentalModifiers {
  energyBoost: number
  valenceBoost: number
  recommendations: string[]
}

export interface EnhancedAnalysis extends MoodAnalysisResponse {
  environmentalContext: {
    weather?: WeatherData
    location?: string
    energyModifier: number
    valenceModifier: number
  }
}

// Gemini AI service
export class GeminiAIService {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY bulunamadı")
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    })
  }

  async analyzeMood(
    mood: string,
    weatherContext: string,
    timeContext: string,
    contextInfo: string
  ): Promise<MoodAnalysisResponse> {
    const prompt = this.buildAnalysisPrompt(mood, weatherContext, timeContext, contextInfo)
    
    console.log('📤 Gemini AI request gönderiliyor...')
    
    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const aiResponse = response.text().trim()

    console.log('📥 Gemini AI response alındı!')
    
    if (!aiResponse) {
      throw new Error("Gemini'den yanıt alınamadı")
    }

    return this.parseGeminiResponse(aiResponse)
  }

  private buildAnalysisPrompt(
    mood: string,
    weatherContext: string,
    timeContext: string,
    contextInfo: string
  ): string {
    return `Ruh hali analizi yap ve kesinlikle sadece JSON formatında döndür. Hava durumu verilerini analiz ve strateji kısmında mutlaka kullan.

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
  }

  private parseGeminiResponse(aiResponse: string): MoodAnalysisResponse {
    try {
      // Clean response
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      // Find JSON boundaries
      const startIndex = cleanedResponse.indexOf('{')
      const endIndex = cleanedResponse.lastIndexOf('}')
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error("JSON format bulunamadı")
      }
      
      const cleanJson = cleanedResponse.substring(startIndex, endIndex + 1)
      console.log('🧹 Temizlenmiş JSON:', cleanJson.substring(0, 200) + '...')
      
      const analysisResult = JSON.parse(cleanJson) as MoodAnalysisResponse
      
      // Validate required fields
      if (!analysisResult.moodAnalysis || !analysisResult.targetMood || 
          typeof analysisResult.moodScore !== 'number') {
        throw new Error("Gemini response eksik alanlar içeriyor")
      }

      return this.normalizeAnalysisResult(analysisResult)
    } catch (parseError) {
      console.error('❌ JSON parse hatası:', parseError)
      console.error('❌ Ham response:', aiResponse)
      throw new Error("Gemini'den geçerli JSON formatı alınamadı")
    }
  }

  private normalizeAnalysisResult(result: MoodAnalysisResponse): MoodAnalysisResponse {
    // Normalize mood score
    result.moodScore = Math.max(1, Math.min(10, Math.round(result.moodScore)))

    // Ensure arrays are arrays
    if (!Array.isArray(result.recommendedGenres)) {
      result.recommendedGenres = ["ambient", "chill", "acoustic"]
    }
    if (!Array.isArray(result.recommendations)) {
      result.recommendations = ["Müziği keşfedin", "Anı yaşayın", "Duygularınızı dinleyin"]
    }
    if (!Array.isArray(result.actionPlan)) {
      result.actionPlan = ["Müzik dinleyin", "Nefes alın", "Kendinizi hissedin"]
    }

    return result
  }
}

// Environmental factors service
export class EnvironmentalFactorsService {
  static calculateModifiers(weather?: WeatherData): EnvironmentalModifiers {
    const modifiers: EnvironmentalModifiers = {
      energyBoost: 0,
      valenceBoost: 0,
      recommendations: []
    }

    if (weather) {
      const moodFactor = WeatherAPI.calculateMoodFactor(weather)
      modifiers.energyBoost += moodFactor.energyModifier
      modifiers.valenceBoost += moodFactor.valenceModifier
      modifiers.recommendations.push(moodFactor.description)
    }

    const timeEffect = WeatherAPI.calculateTimeEffect()
    const seasonEffect = WeatherAPI.calculateSeasonEffect()
    
    modifiers.energyBoost += timeEffect.energyModifier + seasonEffect.energyModifier
    modifiers.valenceBoost += timeEffect.valenceModifier + seasonEffect.valenceModifier
    modifiers.recommendations.push(timeEffect.description)

    return modifiers
  }

  static buildWeatherContext(weather?: WeatherData): string {
    if (!weather) return ""
    
    return `Mevcut hava durumu: ${weather.temperature}°C ${weather.description}, nem %${weather.humidity}, rüzgar ${weather.windSpeed} km/h. Hava durumu ruh haline etkisi: ${WeatherAPI.calculateMoodFactor(weather).description}`
  }

  static buildTimeContext(): string {
    const timeEffect = WeatherAPI.calculateTimeEffect()
    const seasonEffect = WeatherAPI.calculateSeasonEffect()
    
    return `Zaman faktörü: ${timeEffect.description}. Mevsimsel etki: ${seasonEffect.description}`
  }

  static applyEnvironmentalEffects(
    result: MoodAnalysisResponse, 
    modifiers: EnvironmentalModifiers
  ): MoodAnalysisResponse {
    // Apply energy level adjustments
    if (modifiers.energyBoost > 0.2) {
      result.energyLevel = "high"
    } else if (modifiers.energyBoost < -0.2) {
      result.energyLevel = "low"
    }

    // Apply valence adjustments
    if (modifiers.valenceBoost > 0.2) {
      result.valence = "positive"
    } else if (modifiers.valenceBoost < -0.2) {
      result.valence = "negative"
    }

    return result
  }
}

// Fallback analysis service
export class FallbackAnalysisService {
  private static readonly CREATIVE_THEMES = [
    "Sessiz Anların Müziği",
    "İç Sesler ve Yankılar", 
    "Düşüncelerin Melodisi",
    "Huzurun Ritmi",
    "Duygusal Yolculuk",
    "Anın Sesi",
    "Kalbin Müziği",
    "Ruhsal Dengeleme"
  ]

  static createFallbackAnalysis(
    mood: string,
    weather?: WeatherData
  ): MoodAnalysisResponse {
    const fallbackScore = 5
    let fallbackEnergy: "low" | "medium" | "high" = "medium"
    let fallbackValence: "negative" | "neutral" | "positive" = "neutral"
    
    // Adjust fallback based on weather
    if (weather) {
      const moodFactor = WeatherAPI.calculateMoodFactor(weather)
      if (moodFactor.energyModifier > 0.1) fallbackEnergy = "high"
      else if (moodFactor.energyModifier < -0.1) fallbackEnergy = "low"
      
      if (moodFactor.valenceModifier > 0.1) fallbackValence = "positive"
      else if (moodFactor.valenceModifier < -0.1) fallbackValence = "negative"
    }
    
    return {
      moodAnalysis: `"${mood}" ruh haliniz${weather ? `, ${weather.temperature}°C ${weather.description} hava koşulları` : ''} ile birleşerek özel bir müzikal atmosfer yaratıyor.`,
      targetMood: "Dengeli ve uyumlu",
      moodScore: fallbackScore,
      musicStrategy: `Ruh haliniz${weather ? ` ve mevcut hava şartları (${weather.temperature}°C, ${weather.description})` : ''} göz önüne alınarak müzik stratejisi geliştiriliyor.`,
      playlistTheme: this.CREATIVE_THEMES[Math.floor(Math.random() * this.CREATIVE_THEMES.length)],
      recommendedGenres: ["ambient", "chill", "acoustic"],
      energyLevel: fallbackEnergy,
      valence: fallbackValence,
      recommendations: ["Müziğin iyileştirici gücüne güvenin", "Anın keyfini çıkarın", "Duygularınızı dinleyin"],
      personalizedInsight: "Ruh haliniz ve çevresel faktörler müzikal deneyiminizi zenginleştiriyor.",
      musicMoodConnection: "Müzik, iç dünyanızla dış dünya arasında köprü görevi görüyor.",
      actionPlan: ["Derin nefes alın", "Müziğe odaklanın", "Bu anı kucaklayın"],
      weatherInfluence: weather ? WeatherAPI.calculateMoodFactor(weather).description : "Çevresel faktörler müzik deneyiminizi destekliyor",
      timeInfluence: WeatherAPI.calculateTimeEffect().description
    }
  }
}

// User management service
export class UserManagementService {
  static async getOrCreateUser(
    email: string,
    name?: string,
    spotifyId?: string
  ): Promise<string> {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log('👤 Mevcut user bulundu:', existingUser.id)
      return existingUser.id
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name: name || 'Spotify User',
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

    console.log('🆕 Yeni user oluşturuldu:', newUser.id)
    return newUser.id
  }

  static async getRecentSessions(userId: string, limit: number = 3) {
    const { data: recentSessions } = await supabase
      .from('mood_sessions')
      .select('current_mood, mood_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return recentSessions || []
  }

  static buildContextInfo(recentSessions: Array<{
    current_mood: string
    mood_score: number
  }>): string {
    if (recentSessions.length === 0) return ""
    
    return `Geçmiş analizler: ${recentSessions.map(s => `"${s.current_mood}" (${s.mood_score}/10)`).join(', ')}`
  }
}

// Session management service
export class SessionManagementService {
  static async saveMoodSession(
    userId: string,
    mood: string,
    analysis: EnhancedAnalysis,
    location?: string
  ): Promise<string> {
    const sessionData = {
      user_id: userId,
      current_mood: mood.substring(0, 500),
      target_mood: analysis.targetMood.substring(0, 200),
      mood_score: analysis.moodScore,
      location: location,
      ai_analysis: JSON.stringify(analysis),
      playlist_strategy: analysis.musicStrategy.substring(0, 500),
      session_date: new Date().toISOString()
    }
    
    const { data: moodSession, error: insertError } = await supabase
      .from('mood_sessions')
      .insert(sessionData)
      .select()
      .single()
      
    if (insertError) {
      console.error('Database error:', insertError)
      throw new Error('Session kaydedilemedi')
    }
    
    const sessionId = moodSession?.id || 'fallback_' + Date.now()
    console.log('💾 Session created:', sessionId)
    
    return sessionId
  }

  static createEnhancedAnalysis(
    analysis: MoodAnalysisResponse,
    weather?: WeatherData,
    location?: string,
    modifiers?: EnvironmentalModifiers
  ): EnhancedAnalysis {
    return {
      ...analysis,
      environmentalContext: {
        weather,
        location,
        energyModifier: modifiers?.energyBoost || 0,
        valenceModifier: modifiers?.valenceBoost || 0
      }
    }
  }
}

// Main mood analysis service
export class MoodAnalysisService {
  private geminiService: GeminiAIService

  constructor() {
    this.geminiService = new GeminiAIService()
  }

  async analyzeMood(request: MoodAnalysisRequest, userEmail: string): Promise<{
    analysis: MoodAnalysisResponse
    sessionId: string
  }> {
    console.log('🧠 Mood analizi başlatılıyor...', { 
      mood: request.mood, 
      location: request.location, 
      hasWeather: !!request.weather 
    })

    // Get or create user
    const session = { user: { email: userEmail, name: undefined }, spotifyId: undefined }
    const userId = await UserManagementService.getOrCreateUser(
      userEmail,
      session.user.name,
      session.spotifyId
    )

    // Calculate environmental effects
    const environmentalModifiers = EnvironmentalFactorsService.calculateModifiers(request.weather)
    const weatherContext = EnvironmentalFactorsService.buildWeatherContext(request.weather)
    const timeContext = EnvironmentalFactorsService.buildTimeContext()

    console.log('🌍 Çevresel etkiler:', environmentalModifiers)

    // Get user context
    const recentSessions = await UserManagementService.getRecentSessions(userId)
    const contextInfo = UserManagementService.buildContextInfo(recentSessions)

    let analysisResult: MoodAnalysisResponse

    try {
      // Try Gemini AI analysis
      analysisResult = await this.geminiService.analyzeMood(
        request.mood,
        weatherContext,
        timeContext,
        contextInfo
      )

      // Apply environmental effects
      analysisResult = EnvironmentalFactorsService.applyEnvironmentalEffects(
        analysisResult,
        environmentalModifiers
      )

      console.log('✨ Analiz başarıyla tamamlandı:', {
        moodScore: analysisResult.moodScore,
        energyLevel: analysisResult.energyLevel,
        valence: analysisResult.valence
      })

    } catch (geminiError) {
      console.error('🚨 Gemini AI hatası:', geminiError)
      
      // Use fallback analysis
      analysisResult = FallbackAnalysisService.createFallbackAnalysis(
        request.mood,
        request.weather
      )
      
      console.log('🔄 Fallback kullanıldı')
    }

    // Create enhanced analysis and save session
    const enhancedAnalysis = SessionManagementService.createEnhancedAnalysis(
      analysisResult,
      request.weather,
      request.location,
      environmentalModifiers
    )

    const sessionId = await SessionManagementService.saveMoodSession(
      userId,
      request.mood,
      enhancedAnalysis,
      request.location
    )

    return {
      analysis: analysisResult,
      sessionId
    }
  }
}