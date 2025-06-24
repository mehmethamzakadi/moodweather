// src/lib/playlist/services.ts
import { WeatherAPI, WeatherData } from "@/lib/weather/api"
import type { SpotifyTrack } from "@/lib/spotify/api"

export interface WeatherContext {
  condition: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
  pressure?: number
  visibility?: number
  location?: string
  country?: string
  city?: string
  windDirection?: number
  uvIndex?: number
  cloudCover?: number
}

export interface TimeEffect {
  timeOfDay: string
  energyModifier: number
  valenceModifier: number
}

export interface AudioFeatures {
  energy: number
  valence: number
  tempo: number
  acousticness: number
  instrumentalness: number
  danceability?: number
  speechiness?: number
  liveness?: number
  loudness?: number
}

export interface PlaylistRequest {
  sessionId: string
  includeTurkish?: boolean
  isPlaylistPrivate?: boolean
}

export interface PlaylistContext {
  analysis: {
    moodAnalysis: string
    recommendedGenres: string[]
    energyLevel: 'low' | 'medium' | 'high'
    valence: 'negative' | 'neutral' | 'positive'
    moodScore: number
    playlistTheme?: string
    environmentalContext?: {
      weather?: WeatherContext
      energyModifier?: number
      valenceModifier?: number
    }
  }
  weather?: WeatherContext
  audioFeatures: AudioFeatures
  genres: string[]
}

// Weather-based audio adjustments
export class WeatherAudioAdjuster {
  static adjustTempo(baseTempo: number, weather: WeatherContext, timeEffect: TimeEffect): number {
    let adjustedTempo = baseTempo
    
    // Weather effect
    const weatherAdjustments = {
      "clear": 10,
      "clear-night": -15,
      "rainy": -20,
      "stormy": 5,
      "cloudy": -10,
      "cloudy-night": -10
    }
    
    adjustedTempo += weatherAdjustments[weather.condition as keyof typeof weatherAdjustments] || 0
    
    // Time effect
    const timeAdjustments = {
      "night": -15,
      "morning": 10,
      "afternoon": 0,
      "evening": -5
    }
    
    adjustedTempo += timeAdjustments[timeEffect.timeOfDay as keyof typeof timeAdjustments] || 0
    
    return Math.max(60, Math.min(180, adjustedTempo))
  }

  static adjustAcousticness(baseAcousticness: number, weather: WeatherContext): number {
    let adjusted = baseAcousticness
    
    const acousticAdjustments = {
      "rainy": 0.2,
      "cloudy-night": 0.2,
      "clear": -0.1,
      "clear-night": 0.15
    }
    
    adjusted += acousticAdjustments[weather.condition as keyof typeof acousticAdjustments] || 0
    
    return Math.max(0.1, Math.min(0.9, adjusted))
  }

  static adjustInstrumentalness(baseInstrumental: number, weather: WeatherContext, timeEffect: TimeEffect): number {
    let adjusted = baseInstrumental
    
    if (timeEffect.timeOfDay === "night") {
      adjusted += 0.1
    }
    
    if (["foggy", "cloudy-night"].includes(weather.condition)) {
      adjusted += 0.15
    }
    
    return Math.max(0.0, Math.min(0.8, adjusted))
  }
}

// Genre enhancement based on weather
export class WeatherGenreEnhancer {
  private static readonly WEATHER_GENRES = {
    "rainy": ["jazz", "blues", "lo-fi", "indie"],
    "clear": ["pop", "dance", "electronic", "upbeat"],
    "clear-night": ["ambient", "chillout", "downtempo"],
    "cloudy-night": ["atmospheric", "post-rock", "ambient"],
    "stormy": ["alternative", "rock", "dramatic"]
  }

  static enhance(baseGenres: string[], weather: WeatherContext | null): string[] {
    if (!weather) return baseGenres
    
    const weatherGenres = this.WEATHER_GENRES[weather.condition as keyof typeof this.WEATHER_GENRES] || []
    const enhanced = [...baseGenres, ...weatherGenres]
    
    return [...new Set(enhanced)] // Remove duplicates
  }
}

// Weather context converter
export class WeatherContextConverter {
  static toWeatherData(weather: WeatherContext): WeatherData {
    const currentTimestamp = Date.now() / 1000
    
    return {
      temperature: weather.temperature,
      description: weather.description,
      condition: weather.condition,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
      pressure: weather.pressure ?? 1013,
      visibility: weather.visibility ?? 10,
      location: weather.location ?? "Unknown",
      country: weather.country ?? "Unknown",
      timezone: "UTC",
      icon: "01d",
      sunrise: currentTimestamp,
      sunset: currentTimestamp + 43200,
      uvIndex: weather.uvIndex ?? 0,
      coordinates: { lat: 0, lon: 0 }
    }
  }
}

// Creative playlist name generator
export class PlaylistNameGenerator {
  private static readonly CREATIVE_NAMES = [
    "Sessiz Anların Müziği",
    "İç Sesler ve Yankılar",
    "Düşüncelerin Melodisi", 
    "Huzurun Ritmi",
    "Duygusal Yolculuk",
    "Anın Sesi",
    "Kalbin Müziği",
    "Ruhsal Dengeleme",
    "Zihnin Sakinliği",
    "Duyguların Dansı",
    "İçsel Armoni",
    "Sessiz Çığlıklar",
    "Melankolinin İzleri",
    "Umudun Notaları",
    "Geçmişin Yankıları",
    "Geleceğin Fısıltıları"
  ]

  static generate(): string {
    const randomIndex = Math.floor(Math.random() * this.CREATIVE_NAMES.length)
    return this.CREATIVE_NAMES[randomIndex]
  }
}

// Main playlist creation service
export class PlaylistCreationService {
  static adjustAudioFeaturesForWeather(
    baseFeatures: AudioFeatures, 
    context: PlaylistContext
  ): AudioFeatures {
    if (!context.weather) return baseFeatures

    const timeEffect = WeatherAPI.calculateTimeEffect()

    const energyModifier = context.analysis.environmentalContext?.energyModifier ?? 0
    const valenceModifier = context.analysis.environmentalContext?.valenceModifier ?? 0

    return {
      ...baseFeatures,
      energy: Math.max(0.1, Math.min(0.9, baseFeatures.energy + energyModifier)),
      valence: Math.max(0.1, Math.min(0.9, baseFeatures.valence + valenceModifier)),
      tempo: WeatherAudioAdjuster.adjustTempo(baseFeatures.tempo ?? 120, context.weather, timeEffect),
      acousticness: WeatherAudioAdjuster.adjustAcousticness(baseFeatures.acousticness ?? 0.5, context.weather),
      instrumentalness: WeatherAudioAdjuster.adjustInstrumentalness(baseFeatures.instrumentalness ?? 0.0, context.weather, timeEffect)
    }
  }

  static createPlaylistDescription(analysis: { moodAnalysis: string }, weather?: WeatherContext | null): string {
    let description = `${analysis.moodAnalysis.substring(0, 150)}...`
    
    if (weather) {
      description += ` 🌤️ ${weather.temperature}°C ${weather.description} hava koşulları dikkate alınarak oluşturuldu.`
    }
    
    description += ` (MoodWeather AI)`
    return description
  }

  static calculateTotalDuration(tracks: SpotifyTrack[]): number {
    return tracks.reduce((sum, track) => sum + track.duration_ms, 0)
  }

  static formatTrackForResponse(track: SpotifyTrack) {
    return {
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name,
      album: track.album.name,
      image: track.album.images[0]?.url,
      spotifyUrl: track.external_urls.spotify,
      previewUrl: track.preview_url,
      duration: track.duration_ms
    }
  }
}