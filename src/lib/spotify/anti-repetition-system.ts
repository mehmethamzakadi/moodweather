// src/lib/spotify/anti-repetition-system.ts - PERFORMANCE OPTIMIZED VERSION
// Tekrar eden şarkı problemi için hızlandırılmış çözüm

import type { SpotifyTrack } from "./api"
import type { SpotifyAPI } from "./api"

interface WeatherContextType {
  condition: string
  temperature: number
  description: string
}

interface BaseSearchParams {
  genres: string[]
  audioFeatures: AudioFeaturesType
  includeTurkish: boolean
  weatherContext?: WeatherContextType
}

interface AudioFeaturesType {
  energy: number
  valence: number
  tempo?: number
  acousticness?: number
  instrumentalness?: number
  danceability?: number
}

export class AntiRepetitionSystem {
  private static cache = new Map<string, { tracks: SpotifyTrack[]; timestamp: number }>()
  private static readonly CACHE_TTL = 5 * 60 * 1000 // PERFORMANCE: Reduced to 5 minutes

  // PERFORMANCE: Simplified variation key generation
  static generateVariationKey(baseParams: BaseSearchParams): string {
    const hour = new Date().getHours()
    const randomSeed = Math.floor(Date.now() / (5 * 60 * 1000)) // Changes every 5 minutes
    
    const paramsString = JSON.stringify({
      genres: baseParams.genres.slice(0, 2), // Reduced genres
      energy: Math.round(baseParams.audioFeatures.energy * 10) / 10,
      valence: Math.round(baseParams.audioFeatures.valence * 10) / 10,
      includeTurkish: baseParams.includeTurkish
    })
    
    return `${paramsString}-${hour}-${randomSeed}`
  }

  // PERFORMANCE: Simplified smart shuffle
  static smartShuffle(tracks: SpotifyTrack[]): SpotifyTrack[] {
    if (tracks.length <= 1) return tracks
    
    // Simple Fisher-Yates shuffle with time-based seed
    const shuffled = [...tracks]
    const seed = Date.now()
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomValue = Math.sin(seed + i) * 10000
      const j = Math.floor((randomValue - Math.floor(randomValue)) * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled
  }

  // PERFORMANCE: Simplified caching
  static getCachedTracks(cacheKey: string): SpotifyTrack[] | null {
    const entry = this.cache.get(cacheKey)
    
    if (!entry) return null
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey)
      return null
    }
    
    console.log(`💾 Using cached results: ${entry.tracks.length} tracks`)
    return this.smartShuffle(entry.tracks)
  }

  static setCachedTracks(cacheKey: string, tracks: SpotifyTrack[]): void {
    // Limit cache size
    if (this.cache.size > 20) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(cacheKey, {
      tracks: this.smartShuffle(tracks),
      timestamp: Date.now()
    })
    
    console.log(`💾 Cached ${tracks.length} tracks`)
  }
}

// PERFORMANCE OPTIMIZED: Much faster search strategy
export class EnhancedSearchStrategy {
  static async executeAntiRepetitionSearch(
    spotifyClient: SpotifyAPI,
    baseParams: BaseSearchParams
  ): Promise<SpotifyTrack[]> {
    
    const variationKey = AntiRepetitionSystem.generateVariationKey(baseParams)
    console.log(`🔍 FAST: Anti-repetition search starting...`)
    
    // Try cache first
    const cachedTracks = AntiRepetitionSystem.getCachedTracks(variationKey)
    if (cachedTracks && cachedTracks.length > 15) {
      console.log(`💾 Using cached results: ${cachedTracks.length} tracks`)
      return cachedTracks
    }
    
    const allTracks: SpotifyTrack[] = []
    
    // PERFORMANCE: Reduced to 2 genres for speed
    for (const genre of baseParams.genres.slice(0, 2)) {
      try {
        // PERFORMANCE: Single simple search per genre
        const searchResults = await spotifyClient.searchTracks({
          genres: [genre], 
          limit: 25
        })
        
        const qualityTracks = searchResults.filter(track => 
          track.popularity > 20 && 
          track.duration_ms > 30000 && 
          track.name.trim().length > 0 && 
          track.artists[0]?.name && track.artists[0].name.trim().length > 0
        )
        
        allTracks.push(...qualityTracks)
        
        // PERFORMANCE: Minimal delay
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error) {
        console.log(`⚠️ Fast search failed for genre: ${genre}`, error)
      }
    }
    
    // Remove duplicates and shuffle
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id))
    
    const finalTracks = AntiRepetitionSystem.smartShuffle(uniqueTracks).slice(0, 40)
    
    // Cache results
    AntiRepetitionSystem.setCachedTracks(variationKey, finalTracks)
    
    console.log(`✨ FAST Anti-repetition completed: ${finalTracks.length} tracks`)
    return finalTracks
  }
}

export default AntiRepetitionSystem