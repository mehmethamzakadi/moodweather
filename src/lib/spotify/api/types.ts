// src/lib/spotify/api/types.ts

// Spotify track arama parametreleri
export interface SpotifySearchParams {
  genres: string[]
  energy?: number // 0.0 - 1.0
  valence?: number // 0.0 - 1.0
  tempo?: number // BPM
  limit?: number
  market?: string
}

// Weather context interface
export interface WeatherContext {
  condition: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
}

// Audio features interface
export interface AudioFeatures {
  energy: number
  valence: number
  tempo: number
  acousticness?: number
  instrumentalness?: number
}

// Spotify track objesi
export interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  uri: string
  preview_url: string | null
  external_urls: { spotify: string }
  duration_ms: number
  popularity: number
}

// Spotify playlist objesi
export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  external_urls: { spotify: string }
  images: { url: string }[]
  tracks: { total: number }
}

// Analysis interface for audio features calculation
export interface AnalysisForAudioFeatures {
  energyLevel?: 'low' | 'medium' | 'high'
  valence?: 'negative' | 'neutral' | 'positive'
  moodScore?: number
}
