// src/lib/spotify/api.ts
import { Session } from "next-auth"

// Spotify API base URL
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// Spotify track arama parametreleri
interface SpotifySearchParams {
  genres: string[]
  energy?: number // 0.0 - 1.0
  valence?: number // 0.0 - 1.0
  tempo?: number // BPM
  limit?: number
  market?: string
}

// Spotify track objesi
interface SpotifyTrack {
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
interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  external_urls: { spotify: string }
  images: { url: string }[]
  tracks: { total: number }
}

// Spotify API helper class
export class SpotifyAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  // API isteği yapmak için base method
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${SPOTIFY_API_BASE}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Spotify API Error:', response.status, error)
      throw new Error(`Spotify API Error: ${response.status}`)
    }

    return response.json()
  }

  // Kullanıcı profilini al
  async getUserProfile() {
    return this.makeRequest('/me')
  }

  // Genre'lere göre şarkı ara
  async searchTracks(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { genres, energy, valence, tempo, limit = 20, market = 'TR' } = params
    
    // Genre'ları Spotify formatına çevir
    const spotifyGenres = this.mapGenresToSpotify(genres)
    
    // Arama query'si oluştur - sadece popüler şarkıları ara
    let query = `year:2020-2024` // Son 4 yılın şarkıları
    
    // URL encode
    const encodedQuery = encodeURIComponent(query)
    
    const endpoint = `/search?q=${encodedQuery}&type=track&limit=${limit}&market=${market}`
    
    console.log('🔍 Spotify search endpoint:', endpoint)
    
    const response = await this.makeRequest(endpoint)
    return response.tracks.items as SpotifyTrack[]
  }

  // Audio features'lara göre track önerileri al
  async getRecommendations(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { genres, energy, valence, tempo, limit = 20 } = params
    
    // Genre'ları Spotify formatına çevir
    const spotifyGenres = this.mapGenresToSpotify(genres)
    
    // Recommendations endpoint kullan (daha iyi sonuçlar verir)
    const seedGenres = spotifyGenres.slice(0, 5).join(',') // Maksimum 5 genre
    
    let endpoint = `/recommendations?seed_genres=${seedGenres}&limit=${limit}&market=TR`
    
    // Audio features ekle
    if (energy !== undefined) endpoint += `&target_energy=${energy}`
    if (valence !== undefined) endpoint += `&target_valence=${valence}`  
    if (tempo !== undefined) endpoint += `&target_tempo=${tempo}`
    
    console.log('🎵 Spotify recommendations endpoint:', endpoint)
    
    const response = await this.makeRequest(endpoint)
    return response.tracks as SpotifyTrack[]
  }

  // Playlist oluştur
  async createPlaylist(userId: string, name: string, description: string): Promise<SpotifyPlaylist> {
    const endpoint = `/users/${userId}/playlists`
    
    const body = {
      name,
      description,
      public: false, // Özel playlist
    }

    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // Playlist'e şarkı ekle
  async addTracksToPlaylist(playlistId: string, trackUris: string[]) {
    const endpoint = `/playlists/${playlistId}/tracks`
    
    const body = {
      uris: trackUris
    }

    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // Genre mapping - AI genre'larını Spotify genre'larına çevir
  private mapGenresToSpotify(genres: string[]): string[] {
    const genreMap: { [key: string]: string[] } = {
      // Elektronik
      'upbeat-electronic': ['electronic', 'dance', 'house'],
      'ambient-electronic': ['ambient', 'electronic', 'chill'],
      'meditative-electronic': ['ambient', 'new-age', 'electronic'],
      
      // Pop ve Dance
      'modern-pop': ['pop', 'indie-pop'],
      'funk-fusion': ['funk', 'soul', 'jazz'],
      'upbeat-pop': ['pop', 'dance-pop'],
      
      // Sakin ve Rahatlatıcı
      'ambient-chill': ['ambient', 'chill', 'downtempo'],
      'acoustic-folk': ['acoustic', 'folk', 'indie-folk'],
      'meditative-folk': ['folk', 'new-age', 'ambient'],
      'sakinleştirici-müzik': ['ambient', 'chill', 'new-age'],
      
      // Melankolik ve İyileştirici
      'melancholic-indie': ['indie', 'indie-rock', 'alternative'],
      'healing-folk': ['folk', 'acoustic', 'singer-songwriter'],
      'cathartic-ambient': ['ambient', 'post-rock', 'experimental'],
      
      // Klasik ve Minimalist
      'neo-classical': ['classical', 'modern-classical', 'piano'],
      'minimalist-piano': ['piano', 'classical', 'instrumental'],
      'restorative-ambient': ['ambient', 'new-age', 'meditation'],
      
      // Doğa ve Meditasyon
      'nature-fusion': ['ambient', 'new-age', 'world'],
      'yenileyici-ortam': ['ambient', 'chill', 'meditation'],
      'doğa-karışımı': ['ambient', 'world', 'new-age'],
      
      // Türkçe genre'lar
      'hareketli-elektronik': ['electronic', 'dance', 'house'],
      'sakinleştirici-ortam': ['ambient', 'chill', 'new-age'],
      'iyileştirici-folk': ['folk', 'acoustic', 'indie-folk'],
      'duygusal-ortam': ['ambient', 'indie', 'alternative'],
      
      // Fallback genel genre'lar
      'pop': ['pop'],
      'rock': ['rock'],
      'jazz': ['jazz'],
      'classical': ['classical'],
      'electronic': ['electronic'],
      'folk': ['folk'],
      'ambient': ['ambient'],
      'indie': ['indie'],
      'chill': ['chill'],
      'acoustic': ['acoustic']
    }

    const mappedGenres: string[] = []
    
    for (const genre of genres) {
      const mapped = genreMap[genre.toLowerCase()]
      if (mapped) {
        mappedGenres.push(...mapped)
      } else {
        // Eğer mapping bulamazsa, genre'ı olduğu gibi kullan
        mappedGenres.push(genre.toLowerCase())
      }
    }

    // Duplicate'ları kaldır ve ilk 5'ini al (Spotify limiti)
    return [...new Set(mappedGenres)].slice(0, 5)
  }

  // AI analizine göre audio features hesapla
  static calculateAudioFeatures(analysis: any) {
    let energy = 0.5 // default
    let valence = 0.5 // default
    let tempo = 120 // default BPM

    // Energy Level'a göre
    switch (analysis.energyLevel) {
      case 'low':
        energy = 0.3
        tempo = 90
        break
      case 'medium':
        energy = 0.6
        tempo = 120
        break
      case 'high':
        energy = 0.8
        tempo = 140
        break
    }

    // Valence'a göre
    switch (analysis.valence) {
      case 'negative':
        valence = 0.3
        break
      case 'neutral':
        valence = 0.5
        break
      case 'positive':
        valence = 0.7
        break
    }

    // Mood score'a göre fine tuning
    const moodScore = analysis.moodScore || 5
    if (moodScore <= 3) {
      valence = Math.max(0.1, valence - 0.2)
      energy = Math.max(0.2, energy - 0.1)
    } else if (moodScore >= 8) {
      valence = Math.min(0.9, valence + 0.1)
      energy = Math.min(0.9, energy + 0.1)
    }

    return { energy, valence, tempo }
  }
}

// Session'dan Spotify API client oluştur
export function createSpotifyClient(session: Session & { accessToken?: string }) {
  if (!session.accessToken) {
    throw new Error('Spotify access token bulunamadı')
  }
  
  return new SpotifyAPI(session.accessToken)
}

// Export types
export type { SpotifyTrack, SpotifyPlaylist, SpotifySearchParams }
