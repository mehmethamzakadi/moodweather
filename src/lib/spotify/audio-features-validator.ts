export interface ValidationResult {
  isValid: boolean
  reason?: string
  score: number
  mismatches: string[]
}// src/lib/spotify/audio-features-validator.ts
// Cigarettes After Sex problemi için acil çözüm

import type { SpotifyTrack, AudioFeatures } from "./api"

interface ExtendedAudioFeatures {
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

export class AudioFeaturesValidator {
  
  // Strict validation for electronic/dance genres
  static validateForElectronicGenres(
    track: SpotifyTrack & { audioFeatures?: AudioFeatures }, 
    targetFeatures: ExtendedAudioFeatures
  ): ValidationResult {
    
    const result: ValidationResult = {
      isValid: true,
      score: 0,
      mismatches: []
    }

    if (!track.audioFeatures) {
      result.isValid = false
      result.reason = "No audio features available"
      return result
    }

    const features = track.audioFeatures
    let score = 100

    // 1. ENERGY VALIDATION (Kritik)
    if (targetFeatures.energy > 0.7) {
      // Yüksek enerji bekliyoruz
      if (features.energy < 0.5) {
        result.isValid = false
        result.mismatches.push(`Energy too low: ${features.energy} (expected > 0.5)`)
        score -= 50
      }
    } else if (targetFeatures.energy < 0.3) {
      // Düşük enerji bekliyoruz
      if (features.energy > 0.6) {
        result.isValid = false
        result.mismatches.push(`Energy too high: ${features.energy} (expected < 0.6)`)
        score -= 30
      }
    }

    // 2. VALENCE VALIDATION (Mood uyumu)
    if (targetFeatures.valence > 0.7) {
      // Pozitif mood bekliyoruz
      if (features.valence < 0.4) {
        result.isValid = false
        result.mismatches.push(`Valence too low: ${features.valence} (expected > 0.4)`)
        score -= 30
      }
    } else if (targetFeatures.valence < 0.3) {
      // Negatif mood bekliyoruz
      if (features.valence > 0.6) {
        result.isValid = false
        result.mismatches.push(`Valence too high: ${features.valence} (expected < 0.6)`)
        score -= 25
      }
    }

    // 3. DANCEABILITY VALIDATION (Elektronik müzik için kritik)
    if (targetFeatures.danceability && targetFeatures.danceability > 0.6) {
      const trackDanceability = (features as AudioFeatures & { danceability?: number }).danceability
      if (trackDanceability && trackDanceability < 0.4) {
        result.isValid = false
        result.mismatches.push(`Danceability too low: ${trackDanceability} (expected > 0.4)`)
        score -= 40
      }
    }

    // 4. TEMPO VALIDATION (BPM uyumu)
    const tempoDiff = Math.abs(features.tempo - targetFeatures.tempo)
    if (targetFeatures.tempo > 120) {
      // Yüksek tempo bekliyoruz
      if (tempoDiff > 40) {
        result.isValid = false
        result.mismatches.push(`Tempo mismatch: ${features.tempo} BPM (expected ~${targetFeatures.tempo} BPM)`)
        score -= 25
      }
    }

    // 5. ACOUSTICNESS VALIDATION (Elektronik müzik için)
    if ((features.acousticness ?? 0) > 0.7) {
      // Çok akustik, elektronik müzik değil
      result.isValid = false
      result.mismatches.push(`Too acoustic: ${features.acousticness ?? 0} (expected < 0.7)`)
      score -= 35
    }

    result.score = Math.max(0, score)
    
    if (result.mismatches.length > 0) {
      console.log(`❌ Track validation failed: ${track.name} by ${track.artists[0]?.name}`)
      result.mismatches.forEach(mismatch => console.log(`   • ${mismatch}`))
    }

    return result
  }

  // Genre-specific validation
  static validateByGenre(
    track: SpotifyTrack & { audioFeatures?: AudioFeatures },
    targetFeatures: ExtendedAudioFeatures,
    genres: string[]
  ): ValidationResult {
    
    const genreType = this.detectGenreType(genres)
    
    switch (genreType) {
      case 'electronic':
        return this.validateForElectronicGenres(track, targetFeatures)
      
      case 'acoustic':
        return this.validateForAcousticGenres(track, targetFeatures)
      
      case 'rock':
        return this.validateForRockGenres(track, targetFeatures)
      
      default:
        return this.validateGeneral(track, targetFeatures)
    }
  }

  private static detectGenreType(genres: string[]): string {
    const genreString = genres.join(' ').toLowerCase()
    
    if (genreString.includes('electro') || genreString.includes('house') || 
        genreString.includes('electronic') || genreString.includes('dance') ||
        genreString.includes('edm') || genreString.includes('techno')) {
      return 'electronic'
    }
    
    if (genreString.includes('acoustic') || genreString.includes('folk') ||
        genreString.includes('singer-songwriter')) {
      return 'acoustic'
    }
    
    if (genreString.includes('rock') || genreString.includes('metal') ||
        genreString.includes('punk')) {
      return 'rock'
    }
    
    return 'general'
  }

  private static validateForAcousticGenres(
    track: SpotifyTrack & { audioFeatures?: AudioFeatures },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _targetFeatures: AudioFeatures
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      score: 100,
      mismatches: []
    }

    if (!track.audioFeatures) {
      result.isValid = false
      result.reason = "No audio features available"
      return result
    }

    const features = track.audioFeatures

    // Acoustic music should have high acousticness
    if ((features.acousticness ?? 0) < 0.3) {
      result.isValid = false
      result.mismatches.push(`Acousticness too low: ${features.acousticness ?? 0}`)
    }

    // Should not be too electronic
    const trackDanceability = (features as AudioFeatures & { danceability?: number }).danceability
    if (features.energy > 0.8 && trackDanceability && trackDanceability > 0.8) {
      result.isValid = false
      result.mismatches.push("Too electronic for acoustic genre")
    }

    return result
  }

  private static validateForRockGenres(
    track: SpotifyTrack & { audioFeatures?: AudioFeatures },
    targetFeatures: AudioFeatures
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      score: 100,
      mismatches: []
    }

    if (!track.audioFeatures) {
      result.isValid = false
      result.reason = "No audio features available"
      return result
    }

    const features = track.audioFeatures

    // Rock should have decent energy
    if (targetFeatures.energy > 0.6 && features.energy < 0.4) {
      result.isValid = false
      result.mismatches.push(`Energy too low for rock: ${features.energy}`)
    }

    // Should not be too electronic or acoustic
    if ((features.acousticness ?? 0) > 0.8) {
      result.isValid = false
      result.mismatches.push("Too acoustic for rock genre")
    }

    return result
  }

  private static validateGeneral(
    track: SpotifyTrack & { audioFeatures?: AudioFeatures },
    targetFeatures: AudioFeatures
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      score: 100,
      mismatches: []
    }

    if (!track.audioFeatures) {
      result.isValid = false
      result.reason = "No audio features available"
      return result
    }

    // General validation with looser thresholds
    const features = track.audioFeatures
    let score = 100

    // Energy check (more flexible)
    const energyDiff = Math.abs(features.energy - targetFeatures.energy)
    if (energyDiff > 0.5) {
      score -= 20
      result.mismatches.push(`Energy mismatch: ${features.energy} vs ${targetFeatures.energy}`)
    }

    // Valence check (more flexible)
    const valenceDiff = Math.abs(features.valence - targetFeatures.valence)
    if (valenceDiff > 0.5) {
      score -= 15
      result.mismatches.push(`Valence mismatch: ${features.valence} vs ${targetFeatures.valence}`)
    }

    result.score = Math.max(0, score)
    
    // General validation is more lenient
    if (result.score < 50) {
      result.isValid = false
    }

    return result
  }

  // Batch validation for multiple tracks
  static validateTracks(
    tracks: (SpotifyTrack & { audioFeatures?: AudioFeatures })[],
    targetFeatures: ExtendedAudioFeatures,
    genres: string[]
  ): {
    validTracks: SpotifyTrack[]
    invalidTracks: { track: SpotifyTrack; reason: string }[]
    stats: { totalTracks: number; validCount: number; averageScore: number }
  } {
    
    const validTracks: SpotifyTrack[] = []
    const invalidTracks: { track: SpotifyTrack; reason: string }[] = []
    let totalScore = 0

    for (const track of tracks) {
      const validation = this.validateByGenre(track, targetFeatures, genres)
      
      if (validation.isValid) {
        validTracks.push(track)
      } else {
        invalidTracks.push({ 
          track, 
          reason: validation.reason || validation.mismatches.join(', ') 
        })
      }
      
      totalScore += validation.score
    }

    const stats = {
      totalTracks: tracks.length,
      validCount: validTracks.length,
      averageScore: tracks.length > 0 ? totalScore / tracks.length : 0
    }

    console.log(`🎵 Validation Results: ${validTracks.length}/${tracks.length} tracks valid (${Math.round(stats.averageScore)}% avg score)`)
    
    return { validTracks, invalidTracks, stats }
  }

  // Blacklist problematic artists/tracks
  static isBlacklisted(track: SpotifyTrack, genres: string[]): boolean {
    const genreType = this.detectGenreType(genres)
    
    if (genreType === 'electronic') {
      const problematicArtists = [
        'cigarettes after sex',
        'lana del rey',
        'billie eilish',
        'the 1975',
        'arctic monkeys',
        'radiohead',
        'clairo',
        'rex orange county',
        'boy pablo',
        'cuco',
        'mac demarco',
        'tame impala'
      ]
      
      const artistName = track.artists[0]?.name.toLowerCase()
      if (problematicArtists.some(artist => artistName.includes(artist))) {
        console.log(`🚫 Blacklisted artist for electronic genre: ${artistName}`)
        return true
      }
      
      // Also check for problematic track characteristics
      const trackName = track.name.toLowerCase()
      const problematicKeywords = ['cry', 'apocalypse', 'sad', 'lonely', 'empty', 'nothing']
      if (problematicKeywords.some(keyword => trackName.includes(keyword))) {
        console.log(`🚫 Blacklisted track keyword for electronic genre: ${track.name}`)
        return true
      }
    }
    
    return false
  }

  // Get enhanced audio features from Spotify API
  static async getEnhancedAudioFeatures(
    spotifyClient: {
      getAudioFeaturesForTrack: (trackId: string) => Promise<{
        energy?: number
        valence?: number
        tempo?: number
        acousticness?: number
        instrumentalness?: number
        danceability?: number
        speechiness?: number
        liveness?: number
        loudness?: number
      }>
    },
    trackId: string
  ): Promise<AudioFeatures | null> {
    try {
      const features = await spotifyClient.getAudioFeaturesForTrack(trackId)
      
      if (!features) return null
      
      return {
        energy: features.energy || 0.5,
        valence: features.valence || 0.5,
        tempo: features.tempo || 120,
        acousticness: features.acousticness || 0.5,
        instrumentalness: features.instrumentalness || 0.1
      } as AudioFeatures
    } catch (error) {
      console.error(`Failed to get audio features for ${trackId}:`, error)
      return null
    }
  }
}

export default AudioFeaturesValidator