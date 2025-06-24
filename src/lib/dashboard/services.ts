// src/lib/dashboard/services.ts
import { WeatherData } from "@/lib/weather/api"

export interface DashboardState {
  moodInput: string
  isAnalyzing: boolean
  lastAnalysis: {
    sessionId: string
    moodAnalysis: string
    recommendedGenres: string[]
  } | null
  includeTurkish: boolean
  isPlaylistPrivate: boolean
  currentWeather: WeatherData | null
}

export interface MoodSubmissionData {
  mood: string
  location?: string
  weather?: WeatherData
  includeTurkish: boolean
  isPlaylistPrivate: boolean
}

export class DashboardService {
  static async submitMoodAnalysis(data: MoodSubmissionData): Promise<{
    sessionId: string
    analysis: {
      moodAnalysis: string
      recommendedGenres: string[]
      energyLevel: string
      valence: string
      moodScore: number
    }
    success: boolean
  }> {
    const response = await fetch('/api/mood/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Analiz başarısız')
    }

    return response.json()
  }

  static buildSubmissionData(
    mood: string,
    currentWeather: WeatherData | null,
    includeTurkish: boolean,
    isPlaylistPrivate: boolean
  ): MoodSubmissionData {
    return {
      mood: mood.trim(),
      location: currentWeather?.location || "Istanbul",
      weather: currentWeather || undefined,
      includeTurkish,
      isPlaylistPrivate
    }
  }

  static validateMoodInput(mood: string): boolean {
    return mood.trim().length >= 3
  }
}