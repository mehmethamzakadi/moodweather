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

// User profile interface
interface SpotifyUserProfile {
  id: string
  display_name: string
  email: string
  followers: { total: number }
  images: { url: string }[]
}

// Playlist interface
interface SpotifyPlaylistResponse {
  id: string
  name: string
  description: string
  external_urls: { spotify: string }
  images: { url: string }[]
  tracks: { total: number }
}

// Analysis interface
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

// Mood session interface
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
    // Validate session
    const session = await getServerSession(authOptions) as ExtendedSession
    const validation = PlaylistValidation.validateSession(session, session?.accessToken)
    if (!validation.isValid) throw validation.error

    // Parse and validate request body
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
    
    // Convert Spotify AudioFeatures to PlaylistContext AudioFeatures
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

      // Use enhanced search strategy with anti-repetition
      const rawTracks = await EnhancedSearchStrategy.executeAntiRepetitionSearch(
        spotifyClient,
        {
          genres: enhancedGenres,
          audioFeatures: adjustedFeatures,
          includeTurkish,
          weatherContext: context.weather
        }
      )

      // Enhanced validation - this will solve the Cigarettes After Sex problem
      const validatedTracks = await this.validateTracksWithAudioFeatures(
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
      
      // Fallback to original search if enhanced search fails
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

  // NEW: Enhanced validation method to prevent Cigarettes After Sex type mismatches
  private async validateTracksWithAudioFeatures(
    spotifyClient: SpotifyAPI,
    tracks: SpotifyTrack[],
    targetFeatures: AudioFeatures,
    genres: string[]
  ): Promise<SpotifyTrack[]> {
    try {
      // Get audio features for all tracks
      const tracksWithFeatures = await Promise.all(
        tracks.map(async (track): Promise<SpotifyTrack & { audioFeatures?: AudioFeatures }> => {
          try {
            const audioFeatures = await AudioFeaturesValidator.getEnhancedAudioFeatures(
              spotifyClient,
              track.id
            )
            return { 
              ...track, 
              audioFeatures: audioFeatures ? {
                energy: audioFeatures.energy,
                valence: audioFeatures.valence,
                tempo: audioFeatures.tempo,
                acousticness: audioFeatures.acousticness ?? 0.5,
                instrumentalness: audioFeatures.instrumentalness ?? 0.1
              } : undefined 
            }
          } catch (error) {
            PlaylistErrorHandler.logError(`Failed to get audio features for ${track.name}`, error)
            return { ...track, audioFeatures: undefined }
          }
        })
      )

      // Filter out blacklisted artists for genre
      const nonBlacklistedTracks = tracksWithFeatures.filter(track => 
        !AudioFeaturesValidator.isBlacklisted(track, genres)
      )

      // Validate audio features compatibility
      const { validTracks, invalidTracks, stats } = AudioFeaturesValidator.validateTracks(
        nonBlacklistedTracks,
        {
          energy: targetFeatures.energy,
          valence: targetFeatures.valence, 
          tempo: targetFeatures.tempo,
          acousticness: targetFeatures.acousticness,
          instrumentalness: targetFeatures.instrumentalness,
          danceability: 0.7 // High danceability for electronic music
        },
        genres
      )

      // Log validation results
      PlaylistErrorHandler.logInfo('Audio features validation completed', {
        totalTracks: tracks.length,
        tracksWithFeatures: tracksWithFeatures.length,
        nonBlacklisted: nonBlacklistedTracks.length,
        validTracks: validTracks.length,
        averageScore: Math.round(stats.averageScore),
        rejectedCount: invalidTracks.length
      })

      // Log some rejected tracks for debugging
      if (invalidTracks.length > 0) {
        PlaylistErrorHandler.logInfo('Sample rejected tracks', 
          invalidTracks.slice(0, 3).map(({ track, reason }) => ({
            name: track.name,
            artist: track.artists[0]?.name,
            reason: reason.substring(0, 100)
          }))
        )
      }

      return validTracks
    } catch (error) {
      PlaylistErrorHandler.logError('Audio features validation failed', error)
      // Fallback to original tracks if validation fails
      return tracks
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
      true // private by default
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
      PlaylistErrorHandler.logInfo('Playlist creation started')

      // 1. Validate and parse request
      const { session, body } = await this.validateAndParseRequest(request)
      const { sessionId, includeTurkish = false } = body

      // 2. Get mood session
      const moodSession = await this.getMoodSession(sessionId)

      // 3. Parse AI analysis
      const analysis = this.parseAIAnalysis(moodSession.ai_analysis)
      
      PlaylistErrorHandler.logInfo('AI analysis loaded', {
        genres: analysis.recommendedGenres,
        energyLevel: analysis.energyLevel,
        valence: analysis.valence,
        hasWeatherData: !!analysis.environmentalContext?.weather
      })

      // 4. Setup Spotify client and get user profile
      const spotifyClient = createSpotifyClient({ accessToken: session.accessToken! })
      const userProfile = await this.getSpotifyUserProfile(spotifyClient)

      // 5. Build context and adjust audio features for weather
      const context = this.buildPlaylistContext(analysis)
      const adjustedFeatures = PlaylistCreationService.adjustAudioFeaturesForWeather(
        context.audioFeatures,
        context
      )

      if (context.weather) {
        PlaylistErrorHandler.logInfo('Weather data integrated', {
          condition: context.weather.condition,
          temperature: context.weather.temperature
        })
      }

      // 6. Search and filter tracks
      const tracks = await this.searchTracks(spotifyClient, context, includeTurkish)
      const selectedTracks = this.selectAndFilterTracks(tracks, includeTurkish, context.weather ?? undefined)

      // 7. Create Spotify playlist
      const playlist = await this.createSpotifyPlaylist(
        spotifyClient, 
        userProfile, 
        analysis, 
        context.weather ?? null
      )

      // 8. Add tracks to playlist
      await this.addTracksToPlaylist(spotifyClient, playlist.id, selectedTracks)

      // 9. Save playlist history
      await this.savePlaylistHistory(
        moodSession,
        playlist.name,
        selectedTracks,
        adjustedFeatures,
        analysis.recommendedGenres,
        playlist.id
      )

      // 10. Return success response
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