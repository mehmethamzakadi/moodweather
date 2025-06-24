// src/app/api/playlist/create/route.ts - IMPROVED VERSION
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createSpotifyClient, SpotifyAPI } from "@/lib/spotify/api"
import { AudioFeaturesValidator } from "@/lib/spotify/audio-features-validator"
import { EnhancedSearchStrategy } from "@/lib/spotify/anti-repetition-system"
import type { SpotifyTrack } from "@/lib/spotify/api"
import type { AudioFeatures } from "@/lib/playlist/services"
import {
  PlaylistCreationService,
  WeatherGenreEnhancer,
  PlaylistNameGenerator,
  type WeatherContext,
  type PlaylistRequest,
  type PlaylistContext
} from "@/lib/playlist/services"
import {
  PlaylistValidation,
  PlaylistErrorHandler
} from "@/lib/playlist/validation"

interface ExtendedSession extends Session {
  accessToken?: string
}

interface SpotifyUserProfile {
  id: string
  display_name: string
  email: string
  followers: { total: number }
  images: { url: string }[]
}

interface SpotifyPlaylistResponse {
  id: string
  name: string
  description: string
  external_urls: { spotify: string }
  images: { url: string }[]
  tracks: { total: number }
}

interface PlaylistAnalysis {
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

interface MoodSession {
  id: string
  user_id: string
  ai_analysis: string
  created_at: string
}

// IMPROVED: Enhanced playlist request interface
interface ImprovedPlaylistRequest extends PlaylistRequest {
  isPlaylistPrivate?: boolean  // This was missing before!
}

class PlaylistRouteHandler {
  private async validateAndParseRequest(request: NextRequest): Promise<{
    session: ExtendedSession
    body: ImprovedPlaylistRequest
  }> {
    const session = await getServerSession(authOptions) as ExtendedSession
    const validation = PlaylistValidation.validateSession(session, session?.accessToken)
    if (!validation.isValid) throw validation.error

    const body: ImprovedPlaylistRequest = await request.json()
    const requestValidation = PlaylistValidation.validateRequest(body)
    if (!requestValidation.isValid) throw requestValidation.error

    return { session, body }
  }

  private async getMoodSession(sessionId: string) {
    const { data: moodSession, error: sessionError } = await supabase
      .from('mood_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    const validation = PlaylistValidation.validateMoodSession(moodSession, sessionError)
    if (!validation.isValid) throw validation.error

    return moodSession
  }

  private parseAIAnalysis(aiAnalysisString: string) {
    const validation = PlaylistValidation.validateAIAnalysis(aiAnalysisString)
    if (!validation.isValid) throw validation.error

    return JSON.parse(aiAnalysisString)
  }

  private async getSpotifyUserProfile(spotifyClient: SpotifyAPI): Promise<SpotifyUserProfile> {
    try {
      const userProfile = await spotifyClient.getUserProfile()
      PlaylistErrorHandler.logSuccess('Spotify getUserProfile()', 
        `${userProfile.display_name} (${userProfile.id})`)
      return userProfile
    } catch (profileError) {
      PlaylistErrorHandler.logError('getUserProfile() failed', profileError)
      const validation = PlaylistValidation.validateSpotifyProfile(profileError)
      if (!validation.isValid) throw validation.error
      throw new Error('Spotify profile validation failed')
    }
  }

  private buildPlaylistContext(analysis: PlaylistAnalysis): PlaylistContext {
    const weather = analysis.environmentalContext?.weather as WeatherContext | undefined
    const baseFeatures = SpotifyAPI.calculateAudioFeatures(analysis)
    
    const audioFeatures: AudioFeatures = {
      energy: baseFeatures.energy,
      valence: baseFeatures.valence,
      tempo: baseFeatures.tempo,
      acousticness: baseFeatures.acousticness || 0.5,
      instrumentalness: baseFeatures.instrumentalness || 0.1
    }
    
    return {
      analysis,
      weather,
      audioFeatures,
      genres: analysis.recommendedGenres
    }
  }

  // IMPROVED: Enhanced search with better track count targeting
  private async searchTracks(
    spotifyClient: SpotifyAPI, 
    context: PlaylistContext, 
    includeTurkish: boolean
  ): Promise<SpotifyTrack[]> {
    try {
      const enhancedGenres = WeatherGenreEnhancer.enhance(context.genres, context.weather ?? null)
      const adjustedFeatures = PlaylistCreationService.adjustAudioFeaturesForWeather(
        context.audioFeatures, 
        context
      )

      PlaylistErrorHandler.logInfo('IMPROVED: Enhanced search starting', { 
        includeTurkish,
        weatherCondition: context.weather?.condition,
        targetEnergy: adjustedFeatures.energy,
        targetValence: adjustedFeatures.valence,
        genres: enhancedGenres.slice(0, 3),
        targetTrackCount: 80  // Increased target
      })

      // First try: Anti-repetition search with higher limit
      let rawTracks: SpotifyTrack[] = []
      try {
        rawTracks = await EnhancedSearchStrategy.executeAntiRepetitionSearch(
          spotifyClient,
          {
            genres: enhancedGenres,
            audioFeatures: adjustedFeatures,
            includeTurkish,
            weatherContext: context.weather
          }
        )
        console.log(`🎵 Anti-repetition search result: ${rawTracks.length} tracks`)
      } catch (antiRepError) {
        PlaylistErrorHandler.logError('Anti-repetition search failed', antiRepError)
        rawTracks = []
      }

      // If anti-repetition didn't get enough tracks, use advanced search
      if (rawTracks.length < 30) {
        try {
          const advancedTracks = await spotifyClient.searchTracksAdvanced({
            genres: enhancedGenres,
            audioFeatures: adjustedFeatures,
            includeTurkish,
            limit: 80, // Increased limit
            weatherContext: context.weather
          })
          
          console.log(`🔍 Advanced search result: ${advancedTracks.length} tracks`)
          
          // Merge with anti-repetition results
          const allTracks = [...rawTracks, ...advancedTracks]
          const uniqueTracks = allTracks.filter((track, index, self) => 
            index === self.findIndex(t => t.id === track.id)
          )
          rawTracks = uniqueTracks
        } catch (advancedError) {
          PlaylistErrorHandler.logError('Advanced search also failed', advancedError)
        }
      }

      // Final fallback: Basic search if still not enough
      if (rawTracks.length < 20) {
        try {
          const basicTracks = await spotifyClient.searchTracks({ 
            genres: context.genres, 
            limit: 50 
          })
          console.log(`📊 Basic fallback search result: ${basicTracks.length} tracks`)
          rawTracks.push(...basicTracks)
        } catch (basicError) {
          PlaylistErrorHandler.logError('Even basic search failed', basicError)
        }
      }

      // Apply validation with more lenient settings
      const validatedTracks = await this.validateTracksWithImprovedFallback(
        spotifyClient,
        rawTracks,
        adjustedFeatures,
        enhancedGenres
      )

      PlaylistErrorHandler.logSuccess(
        `IMPROVED: Search completed with ${validatedTracks.length} validated tracks from ${rawTracks.length} candidates`, 
        'Enhanced search strategy'
      )
      
      return validatedTracks
    } catch (searchError) {
      PlaylistErrorHandler.logError('All search strategies failed', searchError)
      throw PlaylistErrorHandler.handleSearchError(searchError)
    }
  }

  // IMPROVED: More lenient track filtering to get more songs
  private selectAndFilterTracks(
    tracks: SpotifyTrack[], 
    includeTurkish: boolean, 
    weather?: WeatherContext
  ): SpotifyTrack[] {
    const validation = PlaylistValidation.validateTracks(tracks)
    if (!validation.isValid) throw validation.error

    // IMPROVED: More generous settings to get more tracks
    const selectedTracks = SpotifyAPI.filterAndDiversifyTracks(tracks, {
      maxPerArtist: 3,      // Increased from 2 to 3
      minPopularity: 15,    // Decreased from 25 to 15
      targetCount: 25,      // Increased from 20 to 25
      includeTurkish,
      weatherPreference: weather
    })

    PlaylistErrorHandler.logSuccess(
      `IMPROVED: Selected ${selectedTracks.length} tracks from ${tracks.length} candidates (target: 25)`
    )
    
    return selectedTracks
  }

  // IMPROVED: More lenient validation with better fallback strategies
  private async validateTracksWithImprovedFallback(
    spotifyClient: SpotifyAPI,
    tracks: SpotifyTrack[],
    targetFeatures: AudioFeatures,
    genres: string[]
  ): Promise<SpotifyTrack[]> {
    
    if (tracks.length === 0) {
      PlaylistErrorHandler.logError('No tracks to validate', null)
      return []
    }

    try {
      PlaylistErrorHandler.logInfo('🔄 IMPROVED: Starting more lenient validation', {
        trackCount: tracks.length,
        targetEnergy: targetFeatures.energy,
        targetValence: targetFeatures.valence
      })

      // Get audio features for validation
      const audioFeaturesMap = new Map<string, AudioFeatures>()
      
      try {
        const trackIds = tracks.map(t => t.id)
        const batchFeatures = await spotifyClient.getBatchAudioFeatures(trackIds)
        
        batchFeatures.forEach((features, index) => {
          if (features && trackIds[index]) {
            audioFeaturesMap.set(trackIds[index], {
              energy: features.energy ?? 0.5,
              valence: features.valence ?? 0.5,
              tempo: features.tempo ?? 120,
              acousticness: features.acousticness ?? 0.5,
              instrumentalness: features.instrumentalness ?? 0.1
            })
          }
        })
        
        PlaylistErrorHandler.logInfo(`✅ Audio features retrieved: ${audioFeaturesMap.size}/${tracks.length}`)
      } catch {
        PlaylistErrorHandler.logError('Audio features batch failed - proceeding without validation', null)
      }

      const tracksWithFeatures: (SpotifyTrack & { audioFeatures?: AudioFeatures })[] = []
      
      for (const track of tracks) {
        const audioFeatures = audioFeaturesMap.get(track.id)
        tracksWithFeatures.push({
          ...track,
          audioFeatures
        })
      }

      const validTracks: SpotifyTrack[] = []
      
      // More lenient filtering
      const nonBlacklistedTracks = tracksWithFeatures.filter(track => {
        try {
          return !AudioFeaturesValidator.isBlacklisted(track, genres)
        } catch {
          return true
        }
      })

      const tracksWithAudioFeatures = nonBlacklistedTracks.filter(t => t.audioFeatures)
      const tracksWithoutAudioFeatures = nonBlacklistedTracks.filter(t => !t.audioFeatures)

      // IMPROVED: More lenient validation thresholds
      if (tracksWithAudioFeatures.length > 0) {
        for (const track of tracksWithAudioFeatures) {
          if (!track.audioFeatures) continue
          
          const features = track.audioFeatures
          let score = 100
          
          // Very lenient energy check
          const energyDiff = Math.abs(features.energy - targetFeatures.energy)
          if (energyDiff > 0.6) score -= 20  // Was stricter before
          
          // Very lenient valence check
          const valenceDiff = Math.abs(features.valence - targetFeatures.valence)
          if (valenceDiff > 0.6) score -= 15  // Was stricter before
          
          // Accept tracks with score > 30 (was 50 before)
          if (score > 30) {
            validTracks.push(track)
          }
        }
        
        PlaylistErrorHandler.logInfo(`🎯 Lenient validation: ${validTracks.length} tracks passed`)
      }

      // Add popular tracks without audio features
      if (validTracks.length < 20) {
        const popularFallbacks = tracksWithoutAudioFeatures
          .filter(track => track.popularity > 35) // Lowered from 45
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, Math.max(10, 25 - validTracks.length)) // Get more tracks

        validTracks.push(...popularFallbacks)
        
        PlaylistErrorHandler.logInfo(`🔄 Popular fallback: Added ${popularFallbacks.length} tracks`)
      }

      // Emergency fallback - get any decent tracks
      if (validTracks.length < 15) {
        const emergencyTracks = tracks
          .filter(track => !validTracks.some(vt => vt.id === track.id))
          .filter(track => track.popularity > 25) // Even more lenient
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, Math.max(15, 25 - validTracks.length))

        validTracks.push(...emergencyTracks)
        
        PlaylistErrorHandler.logError(`🚨 Emergency fallback: Added ${emergencyTracks.length} tracks`, null)
      }

      PlaylistErrorHandler.logSuccess(`🎉 IMPROVED validation completed`, {
        totalInput: tracks.length,
        withAudioFeatures: tracksWithAudioFeatures.length,
        withoutAudioFeatures: tracksWithoutAudioFeatures.length,
        finalValidCount: validTracks.length,
        successRate: `${Math.round((validTracks.length / Math.max(tracks.length, 1)) * 100)}%`
      })

      return validTracks

    } catch (error) {
      PlaylistErrorHandler.logError('🔥 All validation strategies failed', error)
      
      // Ultimate fallback - just return popular tracks
      const ultimateFallback = tracks
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 20) // At least 20 tracks
      
      PlaylistErrorHandler.logError(`🆘 Ultimate fallback: ${ultimateFallback.length} most popular tracks`, null)
      return ultimateFallback
    }
  }

  // IMPROVED: Fixed privacy parameter passing
  private async createSpotifyPlaylist(
    spotifyClient: SpotifyAPI,
    userProfile: SpotifyUserProfile,
    analysis: PlaylistAnalysis,
    weather: WeatherContext | null,
    isPrivate: boolean = true  // FIXED: Added this parameter!
  ): Promise<SpotifyPlaylistResponse> {
    const playlistName = analysis.playlistTheme || PlaylistNameGenerator.generate()
    const playlistDescription = PlaylistCreationService.createPlaylistDescription(analysis, weather)

    // FIXED: Pass the isPrivate parameter correctly
    const playlist = await spotifyClient.createPlaylist(
      userProfile.id,
      playlistName,
      playlistDescription,
      isPrivate  // This was missing before!
    )

    PlaylistErrorHandler.logSuccess(
      `Playlist created: "${playlist.name}" (${playlist.id})`, 
      `Privacy: ${isPrivate ? 'Private' : 'Public'}`
    )
    return playlist
  }

  private async addTracksToPlaylist(spotifyClient: SpotifyAPI, playlistId: string, tracks: SpotifyTrack[]): Promise<void> {
    const trackUris = tracks.map(track => track.uri)
    await spotifyClient.addTracksToPlaylist(playlistId, trackUris)
    PlaylistErrorHandler.logSuccess(`Added ${tracks.length} tracks to playlist`)
  }

  private async savePlaylistHistory(
    moodSession: MoodSession,
    playlistName: string,
    selectedTracks: SpotifyTrack[],
    audioFeatures: AudioFeatures,
    genres: string[],
    playlistId: string
  ): Promise<void> {
    const totalDuration = PlaylistCreationService.calculateTotalDuration(selectedTracks)

    const { error: insertError } = await supabase
      .from('playlist_history')
      .insert({
        user_id: moodSession.user_id,
        session_id: moodSession.id,
        playlist_name: playlistName,
        track_count: selectedTracks.length,
        total_duration: Math.round(totalDuration / 1000),
        average_energy: audioFeatures.energy,
        average_valence: audioFeatures.valence,
        average_tempo: audioFeatures.tempo,
        genres: genres.join(', '),
        spotify_playlist_id: playlistId,
        generated_at: new Date().toISOString(),
        play_count: 0
      })

    if (insertError) {
      PlaylistErrorHandler.logError('Playlist history save failed', insertError)
    }
  }

  private buildSuccessResponse(
    playlist: SpotifyPlaylistResponse,
    selectedTracks: SpotifyTrack[],
    audioFeatures: AudioFeatures,
    hasWeather: boolean,
    isPrivate: boolean
  ): NextResponse {
    const totalDuration = PlaylistCreationService.calculateTotalDuration(selectedTracks)

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        spotifyUrl: playlist.external_urls.spotify,
        trackCount: selectedTracks.length,
        totalDuration: Math.round(totalDuration / 1000),
        weatherEnhanced: hasWeather,
        isPrivate: isPrivate, // IMPROVED: Include privacy status in response
        tracks: selectedTracks.map(PlaylistCreationService.formatTrackForResponse)
      },
      audioFeatures,
      message: `${hasWeather ? 'Hava durumu destekli ' : ''}playlist başarıyla oluşturuldu! (${selectedTracks.length} şarkı, ${isPrivate ? 'Gizli' : 'Herkese Açık'})`
    })
  }

  // IMPROVED: Main handler with all fixes
  async handlePlaylistCreation(request: NextRequest): Promise<NextResponse> {
    try {
      PlaylistErrorHandler.logInfo('🎵 IMPROVED: Playlist creation started')

      const { session, body } = await this.validateAndParseRequest(request)
      const { sessionId, includeTurkish = false, isPlaylistPrivate = true } = body // FIXED: Extract privacy setting

      PlaylistErrorHandler.logInfo('📝 Request parameters:', {
        sessionId,
        includeTurkish,
        isPlaylistPrivate
      })

      const moodSession = await this.getMoodSession(sessionId)
      const analysis = this.parseAIAnalysis(moodSession.ai_analysis)
      
      PlaylistErrorHandler.logInfo('🧠 AI analysis loaded', {
        genres: analysis.recommendedGenres,
        energyLevel: analysis.energyLevel,
        valence: analysis.valence,
        hasWeatherData: !!analysis.environmentalContext?.weather
      })

      const spotifyClient = createSpotifyClient({ accessToken: session.accessToken! })
      const userProfile = await this.getSpotifyUserProfile(spotifyClient)

      const context = this.buildPlaylistContext(analysis)
      const adjustedFeatures = PlaylistCreationService.adjustAudioFeaturesForWeather(
        context.audioFeatures,
        context
      )

      if (context.weather) {
        PlaylistErrorHandler.logInfo('🌤️ Weather data integrated', {
          condition: context.weather.condition,
          temperature: context.weather.temperature
        })
      }

      const tracks = await this.searchTracks(spotifyClient, context, includeTurkish)
      const selectedTracks = this.selectAndFilterTracks(tracks, includeTurkish, context.weather ?? undefined)

      // IMPROVED: Better minimum track requirement
      if (selectedTracks.length < 8) {  // Lowered from 5 to accommodate better UX
        PlaylistErrorHandler.logError('Insufficient tracks found', { 
          foundTracks: selectedTracks.length,
          required: 8 
        })
        
        return NextResponse.json({
          success: false,
          error: `Sadece ${selectedTracks.length} şarkı bulunabildi. En az 8 şarkı gerekli. Lütfen farklı mood/hava durumu kombinasyonu deneyin veya Türkçe müzik seçeneğini açın.`
        }, { status: 400 })
      }

      // FIXED: Pass privacy parameter to playlist creation
      const playlist = await this.createSpotifyPlaylist(
        spotifyClient, 
        userProfile, 
        analysis, 
        context.weather ?? null,
        isPlaylistPrivate  // FIXED: This parameter was missing!
      )

      await this.addTracksToPlaylist(spotifyClient, playlist.id, selectedTracks)

      await this.savePlaylistHistory(
        moodSession,
        playlist.name,
        selectedTracks,
        adjustedFeatures,
        analysis.recommendedGenres,
        playlist.id
      )

      // IMPROVED: Enhanced success response
      return this.buildSuccessResponse(
        playlist,
        selectedTracks,
        adjustedFeatures,
        !!context.weather,
        isPlaylistPrivate  // IMPROVED: Include privacy status
      )

    } catch (error) {
      if (error instanceof NextResponse) {
        return error
      }
      return PlaylistErrorHandler.handleGenericError(error)
    }
  }
}

export async function POST(request: NextRequest) {
  const handler = new PlaylistRouteHandler()
  return handler.handlePlaylistCreation(request)
}