// src/app/api/playlist/create/route.ts
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

class PlaylistRouteHandler {
  private async validateAndParseRequest(request: NextRequest): Promise<{
    session: ExtendedSession
    body: PlaylistRequest
  }> {
    const session = await getServerSession(authOptions) as ExtendedSession
    const validation = PlaylistValidation.validateSession(session, session?.accessToken)
    if (!validation.isValid) throw validation.error

    const body: PlaylistRequest = await request.json()
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

      PlaylistErrorHandler.logInfo('Enhanced search with anti-repetition starting', { 
        includeTurkish,
        weatherCondition: context.weather?.condition,
        targetEnergy: adjustedFeatures.energy,
        targetValence: adjustedFeatures.valence,
        genres: enhancedGenres.slice(0, 3)
      })

      const rawTracks = await EnhancedSearchStrategy.executeAntiRepetitionSearch(
        spotifyClient,
        {
          genres: enhancedGenres,
          audioFeatures: adjustedFeatures,
          includeTurkish,
          weatherContext: context.weather
        }
      )

      const validatedTracks = await this.validateTracksWithAudioFeaturesFallback(
        spotifyClient,
        rawTracks,
        adjustedFeatures,
        enhancedGenres
      )

      PlaylistErrorHandler.logSuccess(
        `Enhanced search completed: ${validatedTracks.length} validated tracks from ${rawTracks.length} candidates`, 
        'anti-repetition + validation system'
      )
      
      return validatedTracks
    } catch (searchError) {
      PlaylistErrorHandler.logError('Enhanced search failed, falling back to original', searchError)
      
      try {
        const fallbackTracks = await spotifyClient.searchTracksAdvanced({
          genres: context.genres,
          audioFeatures: context.audioFeatures,
          includeTurkish,
          limit: 50,
          weatherContext: context.weather
        })
        
        return fallbackTracks.slice(0, 25)
      } catch (fallbackError) {
        throw PlaylistErrorHandler.handleSearchError(fallbackError)
      }
    }
  }

  private selectAndFilterTracks(
    tracks: SpotifyTrack[], 
    includeTurkish: boolean, 
    weather?: WeatherContext
  ): SpotifyTrack[] {
    const validation = PlaylistValidation.validateTracks(tracks)
    if (!validation.isValid) throw validation.error

    const selectedTracks = SpotifyAPI.filterAndDiversifyTracks(tracks, {
      maxPerArtist: 2,
      minPopularity: 25,
      targetCount: 20,
      includeTurkish,
      weatherPreference: weather
    })

    PlaylistErrorHandler.logSuccess(
      `Selected ${selectedTracks.length} tracks from ${tracks.length} candidates`
    )
    
    return selectedTracks
  }

  private async validateTracksWithAudioFeaturesFallback(
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
      PlaylistErrorHandler.logInfo('🔄 Starting robust audio features validation', {
        trackCount: tracks.length,
        targetEnergy: targetFeatures.energy,
        targetValence: targetFeatures.valence
      })

      // Strategy 1: Try batch audio features
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
        
        PlaylistErrorHandler.logInfo(`✅ Batch audio features: ${audioFeaturesMap.size}/${tracks.length} successful`)
      } catch {
        PlaylistErrorHandler.logError('⚠️ Batch audio features failed - using fallback strategies', null)
      }

      // Strategy 2: Process tracks with available audio features
      const tracksWithFeatures: (SpotifyTrack & { audioFeatures?: AudioFeatures })[] = []
      
      for (const track of tracks) {
        const audioFeatures = audioFeaturesMap.get(track.id)
        tracksWithFeatures.push({
          ...track,
          audioFeatures
        })
      }

      // Strategy 3: Smart filtering with multiple fallback levels
      const validTracks: SpotifyTrack[] = []
      
      // Filter out blacklisted artists first
      const nonBlacklistedTracks = tracksWithFeatures.filter(track => {
        try {
          return !AudioFeaturesValidator.isBlacklisted(track, genres)
        } catch {
          return true
        }
      })

      const tracksWithAudioFeatures = nonBlacklistedTracks.filter(t => t.audioFeatures)
      const tracksWithoutAudioFeatures = nonBlacklistedTracks.filter(t => !t.audioFeatures)

      // Level 1: Strict validation for tracks WITH audio features
      if (tracksWithAudioFeatures.length > 0) {
        try {
          const { validTracks: strictlyValid } = AudioFeaturesValidator.validateTracks(
            tracksWithAudioFeatures,
            {
              energy: targetFeatures.energy,
              valence: targetFeatures.valence,
              tempo: targetFeatures.tempo,
              acousticness: targetFeatures.acousticness,
              instrumentalness: targetFeatures.instrumentalness,
              danceability: 0.6
            },
            genres
          )
          
          validTracks.push(...strictlyValid)
          PlaylistErrorHandler.logInfo(`🎯 Strict validation: ${strictlyValid.length} tracks passed`)
        } catch {
          PlaylistErrorHandler.logError('Strict validation failed, using popularity fallback', null)
        }
      }

      // Level 2: Popularity-based fallback for tracks WITHOUT audio features
      if (validTracks.length < 10 && tracksWithoutAudioFeatures.length > 0) {
        const popularFallbacks = tracksWithoutAudioFeatures
          .filter(track => track.popularity > 45)
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, Math.max(5, 15 - validTracks.length))

        validTracks.push(...popularFallbacks)
        
        PlaylistErrorHandler.logInfo(`🔄 Popularity fallback: Added ${popularFallbacks.length} popular tracks`)
      }

      // Level 3: Emergency fallback
      if (validTracks.length < 8) {
        const emergencyTracks = tracks
          .filter(track => !validTracks.some(vt => vt.id === track.id))
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, Math.max(8, 18 - validTracks.length))

        validTracks.push(...emergencyTracks)
        
        PlaylistErrorHandler.logError(`🚨 Emergency fallback: Added ${emergencyTracks.length} tracks by popularity`, null)
      }

      PlaylistErrorHandler.logSuccess(`🎉 Audio features validation completed`, {
        totalInput: tracks.length,
        withAudioFeatures: tracksWithAudioFeatures.length,
        withoutAudioFeatures: tracksWithoutAudioFeatures.length,
        finalValidCount: validTracks.length,
        successRate: `${Math.round((validTracks.length / tracks.length) * 100)}%`
      })

      return validTracks

    } catch (error) {
      PlaylistErrorHandler.logError('🔥 All validation strategies failed', error)
      
      const ultimateFallback = tracks
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 12)
      
      PlaylistErrorHandler.logError(`🆘 Ultimate fallback: ${ultimateFallback.length} most popular tracks`, null)
      return ultimateFallback
    }
  }

  private async createSpotifyPlaylist(
    spotifyClient: SpotifyAPI,
    userProfile: SpotifyUserProfile,
    analysis: PlaylistAnalysis,
    weather?: WeatherContext | null
  ): Promise<SpotifyPlaylistResponse> {
    const playlistName = analysis.playlistTheme || PlaylistNameGenerator.generate()
    const playlistDescription = PlaylistCreationService.createPlaylistDescription(analysis, weather)

    const playlist = await spotifyClient.createPlaylist(
      userProfile.id,
      playlistName,
      playlistDescription,
      true
    )

    PlaylistErrorHandler.logSuccess('Playlist created', `${playlist.name} (${playlist.id})`)
    return playlist
  }

  private async addTracksToPlaylist(spotifyClient: SpotifyAPI, playlistId: string, tracks: SpotifyTrack[]): Promise<void> {
    const trackUris = tracks.map(track => track.uri)
    await spotifyClient.addTracksToPlaylist(playlistId, trackUris)
    PlaylistErrorHandler.logSuccess('Tracks added to playlist')
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
    hasWeather: boolean
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
        tracks: selectedTracks.map(PlaylistCreationService.formatTrackForResponse)
      },
      audioFeatures,
      message: hasWeather 
        ? "Hava durumu destekli playlist başarıyla oluşturuldu!"
        : "Playlist başarıyla oluşturuldu!"
    })
  }

  async handlePlaylistCreation(request: NextRequest): Promise<NextResponse> {
    try {
      PlaylistErrorHandler.logInfo('🎵 Playlist creation started')

      const { session, body } = await this.validateAndParseRequest(request)
      const { sessionId, includeTurkish = false } = body

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

      if (selectedTracks.length < 5) {
        PlaylistErrorHandler.logError('Insufficient tracks found', { 
          foundTracks: selectedTracks.length,
          required: 5 
        })
        
        return NextResponse.json({
          success: false,
          error: 'Yeterli şarkı bulunamadı. Lütfen farklı mood/hava durumu kombinasyonu deneyin.'
        }, { status: 400 })
      }

      const playlist = await this.createSpotifyPlaylist(
        spotifyClient, 
        userProfile, 
        analysis, 
        context.weather ?? null
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

      return this.buildSuccessResponse(
        playlist,
        selectedTracks,
        adjustedFeatures,
        !!context.weather
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