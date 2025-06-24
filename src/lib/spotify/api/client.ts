// src/lib/spotify/api/client.ts

import type { 
  SpotifySearchParams, 
  SpotifyTrack, 
  SpotifyPlaylist, 
  AudioFeatures, 
  WeatherContext 
} from './types'
import { removeDuplicateTracks, isTurkish, calculateAudioFeatures } from './utils'
import { enhanceGenresWithWeather, generateWeatherQueries } from './weather'
import { generateGenreSpecificQueries, generateMoodKeywords } from './genres'
import { filterAndDiversifyTracks } from './filters'

// Spotify API base URL
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

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

  // Get audio features for a track
  async getAudioFeaturesForTrack(trackId: string) {
    try {
      const endpoint = `/audio-features/${trackId}`
      return await this.makeRequest(endpoint)
    } catch (error) {
      console.error(`Failed to get audio features for track ${trackId}:`, error)
      return null
    }
  }

  // Genre'lere göre şarkı ara
  async searchTracks(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { limit = 20 } = params
    
    const query = `popular`
    const encodedQuery = encodeURIComponent(query)
    const endpoint = `/search?q=${encodedQuery}&type=track&limit=${limit}`
    
    const response = await this.makeRequest(endpoint)
    return response.tracks.items as SpotifyTrack[]
  }

  // Genre temelli tutarlı şarkı arama
  async searchTracksWithGenre(genres: string[]): Promise<SpotifyTrack[]> {
    const genreQueries = generateGenreSpecificQueries(genres)
    const allTracks: SpotifyTrack[] = []
    
    for (const query of genreQueries.slice(0, 5)) {
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=12`
        
        const response = await this.makeRequest(endpoint)
        const tracks = response.tracks.items as SpotifyTrack[]
        const consistentTracks = tracks.filter(track => track.popularity > 40)
        allTracks.push(...consistentTracks)
        
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch (error) {
        console.log('⚠️ Genre search hatası:', query, error)
        continue
      }
    }
    
    return allTracks
  }

  // Playlist oluştur
  async createPlaylist(userId: string, name: string, description: string, isPrivate: boolean = true): Promise<SpotifyPlaylist> {
    const endpoint = `/users/${userId}/playlists`
    
    const body = {
      name,
      description,
      public: !isPrivate,
      collaborative: false
    }

    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    
    return response
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

  // HAVA DURUMU DESTEKLİ gelişmiş şarkı arama
  async searchTracksAdvanced(params: SpotifySearchParams & { 
    audioFeatures?: AudioFeatures;
    includeTurkish?: boolean;
    weatherContext?: WeatherContext;
  }): Promise<SpotifyTrack[]> {
    const { genres, audioFeatures, includeTurkish = false, limit = 50, weatherContext } = params
    
    console.log('🔍 Hava durumu destekli gelişmiş arama...', { 
      genres, 
      includeTurkish, 
      hasWeather: !!weatherContext,
      weatherCondition: weatherContext?.condition 
    })
    
    const allTracks: SpotifyTrack[] = []
    
    // Hava durumu ile genişletilmiş genre'lar
    const enhancedGenres = weatherContext 
      ? enhanceGenresWithWeather(genres, weatherContext)
      : genres
    
    console.log('🌤️ Hava durumu genişletilmiş türler:', enhancedGenres)
    
    // Strateji 1: Hava durumu destekli genre aramalar
    for (const genre of enhancedGenres.slice(0, 4)) {
      try {
        const genreTracks = await this.searchTracksWithGenre([genre])
        allTracks.push(...genreTracks)
        console.log(`🎵 Hava destekli genre "${genre}": ${genreTracks.length} şarkı`)
        
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.log(`⚠️ Genre arama hatası: ${genre}`, error)
      }
    }
    
    // Strateji 2: Hava durumu bazlı özel aramalar
    if (weatherContext) {
      try {
        const weatherTracks = await this.searchByWeatherMood(weatherContext)
        allTracks.push(...weatherTracks)
        console.log(`🌤️ Hava durumu arama: ${weatherTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Hava durumu arama hatası:', error)
      }
    }
    
    // Strateji 3: Audio features bazlı arama
    if (audioFeatures) {
      try {
        const moodBasedTracks = await this.searchByMoodKeywords(audioFeatures)
        allTracks.push(...moodBasedTracks)
        console.log(`🎧 Mood arama: ${moodBasedTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Mood arama hatası:', error)
      }
    }
    
    // Strateji 4: Popüler şarkılar (fallback)
    if (allTracks.length < 30) {
      try {
        const popularTracks = await this.searchTracks({ genres: [], limit: 20 })
        allTracks.push(...popularTracks)
        console.log(`📊 Popüler şarkılar: ${popularTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Popüler arama hatası:', error)
      }
    }
    
    // Türkçe filtreleme
    let filteredTracks = allTracks
    if (!includeTurkish) {
      const beforeCount = filteredTracks.length
      filteredTracks = allTracks.filter(track => {
        const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`
        return !isTurkish(trackText)
      })
      console.log(`🌍 Türkçe filtre: ${beforeCount} -> ${filteredTracks.length} şarkı`)
    }
    
    // Duplicate'ları kaldır
    const uniqueTracks = removeDuplicateTracks(filteredTracks)
    console.log(`✨ Benzersiz şarkılar: ${uniqueTracks.length}`)
    
    return uniqueTracks.slice(0, limit)
  }

  // Hava durumu bazlı özel şarkı arama
  private async searchByWeatherMood(weather: WeatherContext): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = []
    const weatherQueries = generateWeatherQueries(weather)
    
    // Her weather query için arama yap
    for (const query of weatherQueries.slice(0, 3)) {
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=8`
        
        const response = await this.makeRequest(endpoint)
        const weatherTracks = response.tracks.items as SpotifyTrack[]
        
        // Popülerlik filtresi
        const filteredTracks = weatherTracks.filter(track => track.popularity > 35)
        tracks.push(...filteredTracks)
        
        console.log(`🌤️ Hava sorgusu "${query}": ${filteredTracks.length} şarkı`)
        
        await new Promise(resolve => setTimeout(resolve, 250))
      } catch (error) {
        console.log(`⚠️ Hava durumu arama hatası: ${query}`, error)
      }
    }
    
    return tracks
  }

  // Mood keywords ile arama
  private async searchByMoodKeywords(audioFeatures: AudioFeatures): Promise<SpotifyTrack[]> {
    const moodKeywords = generateMoodKeywords(audioFeatures)
    const tracks: SpotifyTrack[] = []
    
    for (const keyword of moodKeywords.slice(0, 4)) {
      try {
        const encodedKeyword = encodeURIComponent(keyword)
        const endpoint = `/search?q=${encodedKeyword}&type=track&limit=10`
        
        const response = await this.makeRequest(endpoint)
        const keywordTracks = response.tracks.items as SpotifyTrack[]
        
        const consistentTracks = keywordTracks.filter(track => track.popularity > 45)
        tracks.push(...consistentTracks)
        
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.log(`⚠️ Mood keyword arama hatası: ${keyword}`, error)
      }
    }
    
    return tracks
  }

  // Static metodlar - backward compatibility için
  static calculateAudioFeatures = calculateAudioFeatures
  static filterAndDiversifyTracks = filterAndDiversifyTracks
}
