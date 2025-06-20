// src/app/api/playlist/create/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createSpotifyClient, SpotifyAPI } from "@/lib/spotify/api"
import type { SpotifyTrack } from "@/lib/spotify/api"

export async function POST(request: NextRequest) {
  try {
    // Session kontrol et
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !(session as any).accessToken) {
      return NextResponse.json(
        { error: "Spotify giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Request body'yi parse et
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID gerekli" },
        { status: 400 }
      )
    }

    console.log('🎵 Playlist oluşturma başlatılıyor...', { sessionId, userEmail: session.user.email })

    // Mood session'ı Supabase'den al
    const { data: moodSession, error: sessionError } = await supabase
      .from('mood_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !moodSession) {
      console.error('Mood session bulunamadı:', sessionError)
      return NextResponse.json(
        { error: "Mood session bulunamadı" },
        { status: 404 }
      )
    }

    // AI analizini parse et
    let analysis
    try {
      analysis = JSON.parse(moodSession.ai_analysis)
    } catch (parseError) {
      console.error('AI analizi parse edilemedi:', parseError)
      return NextResponse.json(
        { error: "AI analizi geçersiz" },
        { status: 400 }
      )
    }

    console.log('🤖 AI analizi:', {
      genres: analysis.recommendedGenres,
      energyLevel: analysis.energyLevel,
      valence: analysis.valence,
      moodScore: analysis.moodScore
    })

    // Spotify API client oluştur
    const spotifyClient = createSpotifyClient(session as any)

    // Kullanıcı profilini al
    const userProfile = await spotifyClient.getUserProfile()
    console.log('👤 Spotify kullanıcısı:', userProfile.display_name, userProfile.id)

    // Audio features hesapla
    const audioFeatures = SpotifyAPI.calculateAudioFeatures(analysis)
    console.log('🎚️ Audio features:', audioFeatures)

    // Şarkı önerileri al
    const tracks: SpotifyTrack[] = await spotifyClient.getRecommendations({
      genres: analysis.recommendedGenres || ['pop', 'chill'],
      energy: audioFeatures.energy,
      valence: audioFeatures.valence,
      tempo: audioFeatures.tempo,
      limit: 25 // Biraz fazla al, sonra filtrele
    })

    console.log(`🔍 ${tracks.length} şarkı bulundu`)

    if (tracks.length === 0) {
      console.log('❌ Şarkı bulunamadı, fallback genre\'larla deneniyor...')
      
      // Fallback genres ile tekrar dene
      const fallbackTracks = await spotifyClient.getRecommendations({
        genres: ['pop', 'indie', 'chill'],
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        limit: 20
      })

      if (fallbackTracks.length === 0) {
        return NextResponse.json(
          { error: "Bu ruh haline uygun şarkı bulunamadı" },
          { status: 404 }
        )
      }

      tracks.push(...fallbackTracks)
    }

    // Şarkıları popülerlik ve çeşitliliğe göre filtrele
    const selectedTracks = tracks
      .filter(track => track.popularity > 30) // Minimum popülerlik
      .sort((a, b) => b.popularity - a.popularity) // Popülerliğe göre sırala
      .slice(0, 20) // İlk 20 şarkıyı al

    console.log(`✨ ${selectedTracks.length} şarkı seçildi`)

    // Playlist adı ve açıklaması oluştur
    const playlistName = analysis.playlistTheme || `${moodSession.current_mood} Playlist`
    const playlistDescription = `${analysis.moodAnalysis.substring(0, 200)}... (MoodWeather AI tarafından oluşturuldu)`

    // Spotify'da playlist oluştur
    const playlist = await spotifyClient.createPlaylist(
      userProfile.id,
      playlistName,
      playlistDescription
    )

    console.log('📝 Playlist oluşturuldu:', playlist.name, playlist.id)

    // Şarkıları playlist'e ekle
    const trackUris = selectedTracks.map(track => track.uri)
    await spotifyClient.addTracksToPlaylist(playlist.id, trackUris)

    console.log('🎶 Şarkılar playlist\'e eklendi')

    // Playlist bilgilerini hesapla
    const totalDuration = selectedTracks.reduce((sum, track) => sum + track.duration_ms, 0)
    const averagePopularity = selectedTracks.reduce((sum, track) => sum + track.popularity, 0) / selectedTracks.length

    // Supabase'e playlist kaydını ekle
    const { data: playlistHistory, error: insertError } = await supabase
      .from('playlist_history')
      .insert({
        user_id: moodSession.user_id,
        session_id: sessionId,
        playlist_name: playlistName,
        track_count: selectedTracks.length,
        total_duration: Math.round(totalDuration / 1000), // saniye cinsinden
        average_energy: audioFeatures.energy,
        average_valence: audioFeatures.valence,
        average_tempo: audioFeatures.tempo,
        genres: analysis.recommendedGenres.join(', '),
        spotify_playlist_id: playlist.id,
        generated_at: new Date().toISOString(),
        play_count: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('Playlist history kaydetme hatası:', insertError)
      // Hata olsa da devam et, playlist oluştu
    }

    // Başarılı response
    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        spotifyUrl: playlist.external_urls.spotify,
        trackCount: selectedTracks.length,
        totalDuration: Math.round(totalDuration / 1000),
        tracks: selectedTracks.map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name,
          album: track.album.name,
          image: track.album.images[0]?.url,
          spotifyUrl: track.external_urls.spotify,
          previewUrl: track.preview_url,
          duration: track.duration_ms
        }))
      },
      audioFeatures,
      message: "Playlist başarıyla oluşturuldu!"
    })

  } catch (error) {
    console.error('💥 Playlist oluşturma hatası:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    // Spotify API hatalarını daha açıklayıcı yap
    let friendlyMessage = "Playlist oluşturulurken bir hata oluştu"
    
    if (errorMessage.includes('Spotify API Error: 401')) {
      friendlyMessage = "Spotify oturumunuz dolmuş, lütfen yeniden giriş yapın"
    } else if (errorMessage.includes('Spotify API Error: 403')) {
      friendlyMessage = "Spotify hesabınızda playlist oluşturma izni yok"
    } else if (errorMessage.includes('Spotify API Error: 429')) {
      friendlyMessage = "Çok fazla istek gönderildi, lütfen bir dakika bekleyin"
    }
    
    return NextResponse.json(
      { 
        error: friendlyMessage,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
