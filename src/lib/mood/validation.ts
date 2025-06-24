// src/lib/mood/validation.ts
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { MoodAnalysisRequest } from "./services"

export interface MoodValidationResult {
  isValid: boolean
  error?: NextResponse
}

export class MoodValidation {
  static validateSession(session: Session | null): MoodValidationResult {
    if (!session?.user?.email) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Giriş yapmış kullanıcı gerekli" },
          { status: 401 }
        )
      }
    }
    return { isValid: true }
  }

  static validateMoodRequest(body: MoodAnalysisRequest): MoodValidationResult {
    if (!body.mood || body.mood.trim().length < 3) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Mood bilgisi en az 3 karakter olmalı" },
          { status: 400 }
        )
      }
    }
    return { isValid: true }
  }
}

export class MoodErrorHandler {
  static handleGenericError(error: unknown): NextResponse {
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

  static createFallbackResponse(analysis: {
    moodAnalysis: string
    recommendedGenres: string[]
    energyLevel: string
    valence: string
    moodScore: number
  }, sessionId: string): NextResponse {
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      analysis: analysis,
      message: "Analiz tamamlandı ama session kaydedilemedi",
      aiPowered: true,
      provider: "gemini"
    })
  }
}