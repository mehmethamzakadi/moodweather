// src/lib/playlist/validation.ts
import { NextResponse } from "next/server"
import type { Session } from "next-auth"
import { PlaylistRequest } from "./services"

export interface ValidationResult {
  isValid: boolean
  error?: NextResponse
}

export class PlaylistValidation {
  static validateSession(session: Session | null, accessToken?: string): ValidationResult {
    if (!session?.user?.email || !accessToken) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Spotify giriş yapmış kullanıcı gerekli" },
          { status: 401 }
        )
      }
    }
    return { isValid: true }
  }

  static validateRequest(body: PlaylistRequest): ValidationResult {
    if (!body.sessionId) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Session ID gerekli" },
          { status: 400 }
        )
      }
    }
    return { isValid: true }
  }

  static validateMoodSession(moodSession: unknown, error: unknown): ValidationResult {
    if (error || !moodSession) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Mood session bulunamadı" },
          { status: 404 }
        )
      }
    }
    return { isValid: true }
  }

  static validateAIAnalysis(aiAnalysis: string): ValidationResult {
    try {
      JSON.parse(aiAnalysis)
      return { isValid: true }
    } catch {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "AI analizi geçersiz" },
          { status: 400 }
        )
      }
    }
  }

  static validateSpotifyProfile(profileError: unknown): ValidationResult {
    if (profileError) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Spotify access token geçersiz. Lütfen çıkış yapıp tekrar giriş yapın." },
          { status: 401 }
        )
      }
    }
    return { isValid: true }
  }

  static validateTracks(tracks: unknown[]): ValidationResult {
    if (tracks.length === 0) {
      return {
        isValid: false,
        error: NextResponse.json(
          { error: "Bu ruh haline uygun şarkı bulunamadı" },
          { status: 404 }
        )
      }
    }
    return { isValid: true }
  }
}

export class PlaylistErrorHandler {
  static handleSearchError(searchError: unknown): NextResponse {
    console.error('🚫 Search API başarısız:', searchError)
    return NextResponse.json(
      { error: "Spotify'dan şarkı alınamadı. Lütfen daha sonra tekrar deneyin." },
      { status: 503 }
    )
  }

  static handleGenericError(error: unknown): NextResponse {
    console.error('💥 Playlist oluşturma hatası:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    return NextResponse.json(
      { 
        error: "Playlist oluşturulurken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }

  static logError(context: string, error: unknown): void {
    console.error(`❌ ${context}:`, error)
  }

  static logSuccess(context: string, data?: unknown): void {
    console.log(`✅ ${context}:`, data)
  }

  static logInfo(context: string, data?: unknown): void {
    console.log(`🔍 ${context}:`, data)
  }
}