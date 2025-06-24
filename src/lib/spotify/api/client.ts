// src/lib/spotify/api/client.ts - PERFORMANCE OPTIMIZED VERSION

import type { 
  SpotifySearchParams, 
  SpotifyTrack, 
  SpotifyPlaylist, 
  AudioFeatures, 
  WeatherContext 
} from './types'
import { removeDuplicateTracks, isTurkish, calculateAudioFeatures, smartShuffle, scoreTrackQuality } from './utils'
import { enhanceGenresWithWeather, generateWeatherQueries } from './weather'
import { generateMoodKeywords } from './genres'
import { filterAndDiversifyTracks } from './filters'

// Spotify API base URL
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// Spotify audio features interface
interface SpotifyAudioFeatures {
  energy: number
  valence: number
  tempo: number
  acousticness: number
  instrumentalness: number
  danceability?: number
  [key: string]: number | string | undefined
}

// PERFORMANCE OPTIMIZED: Spotify API helper class
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

  // Get audio features for a track - improved with better error handling
  async getAudioFeaturesForTrack(trackId: string): Promise<SpotifyAudioFeatures | null> {
    try {
      const endpoint = `/audio-features/${trackId}`
      const result = await this.makeRequest(endpoint)
      return result
    } catch (error: unknown) {
      // 403 hatası yaygın - session scope problemi olabilir
      if (error instanceof Error && error.message?.includes('403')) {
        console.warn(`⚠️ Audio features access denied for track ${trackId} - scope issue`)
        return null
      }
      
      // Diğer hatalar
      console.error(`Failed to get audio features for track ${trackId}:`, error)
      return null
    }
  }

  // Batch audio features - multiple tracks at once (more efficient)
  async getBatchAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    if (trackIds.length === 0) return []
    
    try {
      // Spotify API supports up to 100 tracks at once
      const batchSize = 100
      const batches: string[][] = []
      
      for (let i = 0; i < trackIds.length; i += batchSize) {
        batches.push(trackIds.slice(i, i + batchSize))
      }
      
      const allFeatures: SpotifyAudioFeatures[] = []
      
      for (const batch of batches) {
        try {
          const ids = batch.join(',')
          const endpoint = `/audio-features?ids=${ids}`
          const response = await this.makeRequest(endpoint)
          
          if (response.audio_features) {
            // Filter out null results and add valid features
            const validFeatures = response.audio_features.filter((features: SpotifyAudioFeatures | null) => features !== null)
            allFeatures.push(...validFeatures)
          }
          
          // PERFORMANCE: Reduced delay
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (error: unknown) {
          console.warn(`⚠️ Batch audio features failed for batch`, error instanceof Error ? error.message : 'Unknown error')
          // Continue with other batches
          continue
        }
      }
      
      return allFeatures
    } catch (error) {
      console.error('Batch audio features completely failed:', error)
      return []
    }
  }

  // PERFORMANCE OPTIMIZED: Faster search with reduced queries
  async searchTracks(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { limit = 30 } = params // Reduced default limit
    
    // PERFORMANCE: Reduced to 2 queries for speed
    const queries = [
      'popular music trending',
      'top hits 2024'
    ]
    
    const allTracks: SpotifyTrack[] = []
    
    for (const query of queries) {
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=${Math.min(limit, 50)}&market=US`
        
        const response = await this.makeRequest(endpoint)
        const tracks = response.tracks.items as SpotifyTrack[]
        
        // Filter for quality tracks
        const qualityTracks = tracks.filter(track => scoreTrackQuality(track) > 40)
        allTracks.push(...qualityTracks)
        
        // PERFORMANCE: Reduced delay
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.log('⚠️ Search query failed:', query, error)
      }
    }
    
    const uniqueTracks = removeDuplicateTracks(allTracks)
    return smartShuffle(uniqueTracks).slice(0, limit)
  }

  // PERFORMANCE OPTIMIZED: Faster genre search
  async searchTracksWithGenre(genres: string[]): Promise<SpotifyTrack[]> {
    const allTracks: SpotifyTrack[] = []
    
    // PERFORMANCE: Reduced to 2 genres for speed
    for (const genre of genres.slice(0, 2)) {
      // Strategy 1: Direct genre search only
      try {
        const genreQuery = `genre:"${genre}"`
        const encodedQuery = encodeURIComponent(genreQuery)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=25&market=US`
        
        const response = await this.makeRequest(endpoint)
        const tracks = response.tracks.items as SpotifyTrack[]
        allTracks.push(...tracks.filter(track => track.popularity > 25))
        
        // PERFORMANCE: Reduced delay
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.log('⚠️ Direct genre search failed:', genre, error)
      }
    }
    
    const uniqueTracks = removeDuplicateTracks(allTracks)
    return smartShuffle(uniqueTracks)
  }

  // Get related genre terms for diversification
  private getRelatedGenreTerms(genre: string): string[] {
    const genreMap: Record<string, string[]> = {
      'electronic': ['edm', 'house', 'techno'],
      'pop': ['indie pop', 'dance pop'],
      'rock': ['indie rock', 'alt rock'],
      'ambient': ['chillout', 'downtempo'],
      'dance': ['edm', 'house'],
      'chill': ['lounge', 'downtempo'],
      'indie': ['indie pop', 'indie rock']
    }
    
    const lowerGenre = genre.toLowerCase()
    for (const [key, terms] of Object.entries(genreMap)) {
      if (lowerGenre.includes(key)) {
        return terms
      }
    }
    
    return [genre + ' music']
  }

  // PERFORMANCE: Fixed privacy parameter and added debug logging
  async createPlaylist(userId: string, name: string, description: string, isPrivate: boolean = true): Promise<SpotifyPlaylist> {
    const endpoint = `/users/${userId}/playlists`
    
    const body = {
      name,
      description,
      public: !isPrivate, // CRITICAL: This logic is correct!
      collaborative: false
    }

    console.log(`🎵 PRIVACY DEBUG: Creating playlist with settings:`, {
      name,
      isPrivate,
      public: body.public,
      body
    })

    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    
    console.log(`✅ Playlist created successfully:`, {
      id: response.id,
      name: response.name,
      public: response.public,
      collaborative: response.collaborative
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

  // PERFORMANCE OPTIMIZED: Faster advanced search
  async searchTracksAdvanced(params: SpotifySearchParams & { 
    audioFeatures?: AudioFeatures;
    includeTurkish?: boolean;
    weatherContext?: WeatherContext;
  }): Promise<SpotifyTrack[]> {
    const { genres, audioFeatures, includeTurkish = false, limit = 60, weatherContext } = params
    
    console.log('🔍 FAST: Advanced search starting...', { 
      genres: genres.slice(0, 2), 
      includeTurkish, 
      hasWeather: !!weatherContext,
      targetLimit: limit
    })
    
    const allTracks: SpotifyTrack[] = []
    
    // Hava durumu ile genişletilmiş genre'lar
    const enhancedGenres = weatherContext 
      ? enhanceGenresWithWeather(genres, weatherContext)
      : genres
    
    // PERFORMANCE: Reduced to 2 genres for speed
    for (const genre of enhancedGenres.slice(0, 2)) {
      try {
        const genreTracks = await this.searchTracksWithGenre([genre])
        allTracks.push(...genreTracks.slice(0, 20))
        console.log(`🎵 Genre "${genre}": ${genreTracks.length} tracks`)
        
        // PERFORMANCE: Reduced delay
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.log(`⚠️ Genre search failed: ${genre}`, error)
      }
    }
    
    // PERFORMANCE: Single weather search only
    if (weatherContext && allTracks.length < 30) {
      try {
        const weatherTracks = await this.searchByWeatherMood(weatherContext)
        allTracks.push(...weatherTracks.slice(0, 15))
        console.log(`🌤️ Weather search: ${weatherTracks.length} tracks`)
      } catch (error) {
        console.log('⚠️ Weather search failed:', error)
      }
    }
    
    // PERFORMANCE: Single mood search only
    if (audioFeatures && allTracks.length < 40) {
      try {
        const moodTracks = await this.searchByMoodKeywords(audioFeatures)
        allTracks.push(...moodTracks.slice(0, 15))
        console.log(`🎧 Mood search: ${moodTracks.length} tracks`)
      } catch (error) {
        console.log('⚠️ Mood search failed:', error)
      }
    }
    
    // PERFORMANCE: Single fallback search
    if (allTracks.length < 30) {
      try {
        const popularTracks = await this.searchTracks({ genres: [], limit: 20 })
        allTracks.push(...popularTracks)
        console.log(`📊 Popular fallback: ${popularTracks.length} tracks`)
      } catch (error) {
        console.log('⚠️ Popular search failed:', error)
      }
    }
    
    // Turkish filtering - IMPROVED
    let filteredTracks = allTracks
    if (!includeTurkish) {
      const beforeCount = filteredTracks.length
      filteredTracks = allTracks.filter(track => {
        const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`
        const isTrackTurkish = isTurkish(trackText)
        
        if (isTrackTurkish) {
          console.log(`🚫 FILTERED OUT Turkish track: "${track.name}" by ${track.artists[0]?.name}`)
        }
        
        return !isTrackTurkish
      })
      console.log(`🌍 Turkish filter: ${beforeCount} -> ${filteredTracks.length} tracks`)
    }
    
    // Remove duplicates and apply smart shuffle
    const uniqueTracks = removeDuplicateTracks(filteredTracks)
    const shuffledTracks = smartShuffle(uniqueTracks)
    
    console.log(`✨ FAST processing: ${allTracks.length} -> ${filteredTracks.length} -> ${uniqueTracks.length} -> returning ${Math.min(shuffledTracks.length, limit)}`)
    
    return shuffledTracks.slice(0, limit)
  }

  // PERFORMANCE OPTIMIZED: Faster weather search
  private async searchByWeatherMood(weather: WeatherContext): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = []
    const weatherQueries = generateWeatherQueries(weather)
    
    // PERFORMANCE: Reduced to 2 weather queries
    for (const query of weatherQueries.slice(0, 2)) {
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=10&market=US`
        
        const response = await this.makeRequest(endpoint)
        const weatherTracks = response.tracks.items as SpotifyTrack[]
        
        const filteredTracks = weatherTracks.filter(track => track.popularity > 25)
        tracks.push(...filteredTracks)
        
        console.log(`🌤️ Weather query "${query}": ${filteredTracks.length} tracks`)
        
        // PERFORMANCE: Reduced delay
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.log(`⚠️ Weather search failed: ${query}`, error)
      }
    }
    
    return tracks
  }

  // PERFORMANCE OPTIMIZED: Faster mood search
  private async searchByMoodKeywords(audioFeatures: AudioFeatures): Promise<SpotifyTrack[]> {
    const moodKeywords = generateMoodKeywords(audioFeatures)
    const tracks: SpotifyTrack[] = []
    
    // PERFORMANCE: Reduced to 2 mood keywords
    for (const keyword of moodKeywords.slice(0, 2)) {
      try {
        const encodedKeyword = encodeURIComponent(keyword)
        const endpoint = `/search?q=${encodedKeyword}&type=track&limit=10&market=US`
        
        const response = await this.makeRequest(endpoint)
        const keywordTracks = response.tracks.items as SpotifyTrack[]
        
        const consistentTracks = keywordTracks.filter(track => track.popularity > 30)
        tracks.push(...consistentTracks)
        
        console.log(`🎭 Mood keyword "${keyword}": ${consistentTracks.length} tracks`)
        
        // PERFORMANCE: Reduced delay
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.log(`⚠️ Mood keyword search failed: ${keyword}`, error)
      }
    }
    
    return tracks
  }

  // Static methods - backward compatibility
  static calculateAudioFeatures = calculateAudioFeatures
  static filterAndDiversifyTracks = filterAndDiversifyTracks
}