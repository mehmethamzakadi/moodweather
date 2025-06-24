// src/lib/spotify/anti-repetition-system.ts
// Tekrar eden şarkı problemi için çözüm

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

interface SearchVariation {
  queryModifications: string[]
  genreVariations: string[]
  timeRangeVariations: string[]
  popularityVariations: string[]
}

interface CacheEntry {
  tracks: SpotifyTrack[]
  timestamp: number
  searchParams: string
  usedCount: number
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
  private static cache = new Map<string, CacheEntry>()
  private static readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes
  private static readonly MAX_CACHE_USES = 3 // Maximum times a cache entry can be used

  // Generate variation key based on current time and parameters
  static generateVariationKey(baseParams: BaseSearchParams): string {
    const hour = new Date().getHours()
    const dayOfWeek = new Date().getDay()
    const randomSeed = Math.floor(Date.now() / (10 * 60 * 1000)) // Changes every 10 minutes
    
    return `${JSON.stringify(baseParams)}-${hour}-${dayOfWeek}-${randomSeed}`
  }

  // Create search variations to prevent repetition
  static createSearchVariations(
    baseGenres: string[],
    targetEnergy: number
  ): SearchVariation {
    
    const variations: SearchVariation = {
      queryModifications: [],
      genreVariations: [],
      timeRangeVariations: [],
      popularityVariations: []
    }

    // Query modifications
    const currentYear = new Date().getFullYear()
    variations.queryModifications = [
      '', // Base query
      `year:${currentYear - 1}-${currentYear}`, // Recent years
      `year:2020-${currentYear}`, // Last few years
      `year:2015-${currentYear}`, // Broader range
      'tag:new' // New releases
    ]

    // Genre variations (add related genres)
    variations.genreVariations = this.expandGenres(baseGenres)

    // Time range variations
    variations.timeRangeVariations = [
      '2024', '2023', '2022', '2021', '2020-2024', '2018-2024'
    ]

    // Popularity variations
    if (targetEnergy > 0.6) {
      // High energy - include underground tracks
      variations.popularityVariations = ['0-40', '20-60', '40-80', '60-100']
    } else {
      // Lower energy - more mainstream
      variations.popularityVariations = ['30-70', '50-90', '70-100']
    }

    return variations
  }

  // Expand genres with related genres
  private static expandGenres(baseGenres: string[]): string[] {
    const expanded = [...baseGenres]
    
    const genreMap: Record<string, string[]> = {
      'electro house': ['progressive house', 'tech house', 'big room house', 'future house'],
      'progressive house': ['electro house', 'tech house', 'deep house', 'trance'],
      'tech house': ['electro house', 'progressive house', 'minimal techno', 'deep house'],
      'electronic': ['synthwave', 'electronica', 'downtempo', 'ambient electronic'],
      'pop': ['electropop', 'synth-pop', 'indie pop', 'dance pop'],
      'dance': ['electronic dance music', 'eurodance', 'club', 'rave'],
      'ambient': ['chillout', 'downtempo', 'new age', 'atmospheric'],
      'rock': ['indie rock', 'alternative rock', 'electronic rock', 'synth rock']
    }

    baseGenres.forEach(genre => {
      const related = genreMap[genre.toLowerCase()]
      if (related) {
        expanded.push(...related)
      }
    })

    return [...new Set(expanded)] // Remove duplicates
  }

  // Smart shuffle with anti-repetition logic
  static smartShuffle(tracks: SpotifyTrack[], previousTracks?: SpotifyTrack[]): SpotifyTrack[] {
    if (!previousTracks || previousTracks.length === 0) {
      return this.timeBasedShuffle(tracks)
    }

    // Get IDs of previous tracks to avoid
    const previousTrackIds = new Set(previousTracks.map(t => t.id))
    const previousArtistIds = new Set(previousTracks.map(t => t.artists[0]?.name.toLowerCase()))

    // Separate new and repeated tracks
    const newTracks = tracks.filter(track => 
      !previousTrackIds.has(track.id) && 
      !previousArtistIds.has(track.artists[0]?.name.toLowerCase())
    )
    const repeatedTracks = tracks.filter(track => 
      previousTrackIds.has(track.id) || 
      previousArtistIds.has(track.artists[0]?.name.toLowerCase())
    )

    console.log(`🔄 Smart shuffle: ${newTracks.length} new, ${repeatedTracks.length} repeated tracks`)

    // Prioritize new tracks, add some repeated tracks at the end
    const shuffledNew = this.timeBasedShuffle(newTracks)
    const shuffledRepeated = this.timeBasedShuffle(repeatedTracks.slice(0, Math.floor(tracks.length * 0.3)))

    return [...shuffledNew, ...shuffledRepeated].slice(0, tracks.length)
  }

  // Time-based shuffle for consistent randomization
  private static timeBasedShuffle(tracks: SpotifyTrack[]): SpotifyTrack[] {
    const shuffled = [...tracks]
    const seed = Math.floor(Date.now() / (5 * 60 * 1000)) // Changes every 5 minutes
    
    // Fisher-Yates shuffle with time-based seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Create pseudo-random number based on time seed and position
      const randomValue = Math.sin(seed + i) * 10000
      const j = Math.floor((randomValue - Math.floor(randomValue)) * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled
  }

  // Cache management
  static getCachedTracks(cacheKey: string): SpotifyTrack[] | null {
    const entry = this.cache.get(cacheKey)
    
    if (!entry) return null
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey)
      return null
    }
    
    // Check if cache has been used too many times
    if (entry.usedCount >= this.MAX_CACHE_USES) {
      console.log(`🔄 Cache max uses reached for key: ${cacheKey}`)
      return null
    }
    
    // Increment usage and return varied tracks
    entry.usedCount++
    return this.addVariationToCachedTracks(entry.tracks, entry.usedCount)
  }

  static setCachedTracks(cacheKey: string, tracks: SpotifyTrack[], searchParams: BaseSearchParams): void {
    this.cache.set(cacheKey, {
      tracks,
      timestamp: Date.now(),
      searchParams: JSON.stringify(searchParams),
      usedCount: 0
    })
    
    // Cleanup old cache entries
    this.cleanupCache()
  }

  // Add variation to cached tracks
  private static addVariationToCachedTracks(
    cachedTracks: SpotifyTrack[], 
    usageCount: number
  ): SpotifyTrack[] {
    const variationPercentage = Math.min(0.4, usageCount * 0.15) // Increase variation with usage
    const variationCount = Math.floor(cachedTracks.length * variationPercentage)
    
    // Keep stable portion
    const stableCount = cachedTracks.length - variationCount
    const stableTracks = this.timeBasedShuffle(cachedTracks).slice(0, stableCount)
    
    console.log(`🎲 Adding ${Math.round(variationPercentage * 100)}% variation (${variationCount} tracks) to cached results`)
    
    return stableTracks
  }

  // Cleanup old cache entries
  private static cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }

  // Generate diverse search queries
  static generateDiverseQueries(
    baseGenre: string,
    variations: SearchVariation,
    targetFeatures: AudioFeaturesType
  ): string[] {
    const queries: string[] = []
    
    // Strategy 1: Genre + Time variations
    variations.timeRangeVariations.slice(0, 2).forEach(timeRange => {
      queries.push(`genre:"${baseGenre}" year:${timeRange}`)
    })
    
    // Strategy 2: Genre + Popularity variations
    variations.popularityVariations.slice(0, 2).forEach(() => {
      queries.push(`genre:"${baseGenre}"`)
    })
    
    // Strategy 3: Related genre searches
    variations.genreVariations.slice(1, 3).forEach(relatedGenre => {
      queries.push(`genre:"${relatedGenre}"`)
    })
    
    // Strategy 4: Energy-based searches
    if (targetFeatures.energy > 0.7) {
      queries.push(`genre:"${baseGenre}" energetic upbeat`)
      queries.push(`danceability genre:"electronic"`)
    } else if (targetFeatures.energy < 0.4) {
      queries.push(`genre:"${baseGenre}" chill ambient`)
      queries.push(`mellow downtempo genre:"chillout"`)
    }
    
    // Strategy 5: Mood-based searches
    if (targetFeatures.valence > 0.7) {
      queries.push(`genre:"${baseGenre}" happy uplifting`)
      queries.push(`feel good genre:"pop"`)
    } else if (targetFeatures.valence < 0.4) {
      queries.push(`genre:"${baseGenre}" melancholic emotional`)
      queries.push(`moody atmospheric genre:"alternative"`)
    }
    
    return queries.slice(0, 8) // Limit to 8 diverse queries
  }
}

// Enhanced Search Strategy Integration
export class EnhancedSearchStrategy {
  static async executeAntiRepetitionSearch(
    spotifyClient: SpotifyAPI,
    baseParams: BaseSearchParams
  ): Promise<SpotifyTrack[]> {
    
    const variationKey = AntiRepetitionSystem.generateVariationKey(baseParams)
    console.log(`🔍 Anti-repetition search with key: ${variationKey.substring(0, 50)}...`)
    
    // Try cache first
    const cachedTracks = AntiRepetitionSystem.getCachedTracks(variationKey)
    if (cachedTracks && cachedTracks.length > 15) {
      console.log(`💾 Using cached results with variation (${cachedTracks.length} tracks)`)
      return AntiRepetitionSystem.smartShuffle(cachedTracks)
    }
    
    // Create search variations
    const variations = AntiRepetitionSystem.createSearchVariations(
      baseParams.genres,
      baseParams.audioFeatures.energy
    )
    
    const allTracks: SpotifyTrack[] = []
    
    // Execute diverse search strategies
    for (const genre of baseParams.genres.slice(0, 3)) {
      const queries = AntiRepetitionSystem.generateDiverseQueries(
        genre,
        variations,
        baseParams.audioFeatures
      )
      
      for (const query of queries.slice(0, 4)) {
        try {
          const searchResults = await spotifyClient.searchTracks({
            genres: [],
            limit: 15
          })
          
          allTracks.push(...searchResults)
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.log(`⚠️ Search query failed: ${query}`, error)
        }
      }
    }
    
    // Remove duplicates and shuffle
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id))
    
    const finalTracks = AntiRepetitionSystem.smartShuffle(uniqueTracks).slice(0, 50)
    
    // Cache results
    AntiRepetitionSystem.setCachedTracks(variationKey, finalTracks, baseParams)
    
    console.log(`✨ Anti-repetition search completed: ${finalTracks.length} tracks`)
    return finalTracks
  }
}

export default AntiRepetitionSystem