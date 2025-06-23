// src/app/api/playlist/create/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createSpotifyClient, SpotifyAPI } from "@/lib/spotify/api"
import type { SpotifyTrack } from "@/lib/spotify/api"
import { WeatherAPI } from "@/lib/weather/api"

interface WeatherContext {
  condition: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
}

interface TimeEffect {
  timeOfDay: string
  energyModifier: number
  valenceModifier: number
}

// Hava durumu için tempo ayarlama
function adjustTempoForWeather(baseTempo: number, weather: WeatherContext, timeEffect: TimeEffect): number {
  let adjustedTempo = baseTempo
  
  // Hava durumu etkisi
  switch (weather.condition) {
    case "clear":
      adjustedTempo += 10 // Güneşli havada daha hareketli
      break
    case "clear-night":
      adjustedTempo -= 15 // Gece daha sakin
      break
    case "rainy":
      adjustedTempo -= 20 // Yağmurda daha yavaş
      break
    case "stormy":
      adjustedTempo += 5 // Fırtınada orta tempo
      break
    case "cloudy":
    case "cloudy-night":
      adjustedTempo -= 10 // Bulutlu havada sakin
      break
  }
  
  // Zaman dilimi etkisi
  if (timeEffect.timeOfDay === "night") {
    adjustedTempo -= 15
  } else if (timeEffect.timeOfDay === "morning") {
    adjustedTempo += 10
  }
  
  return Math.max(60, Math.min(180, adjustedTempo))
}

// Hava durumu için acousticness ayarlama
function adjustAcousticnessForWeather(baseAcousticness: number, weather: WeatherContext): number {
  let adjusted = baseAcousticness
  
  switch (weather.condition) {
    case "rainy":
    case "cloudy-night":
      adjusted += 0.2 // Yağmur/gece daha akustik
      break
    case "clear":
      adjusted -= 0.1 // Güneş daha elektronik
      break
    case "clear-night":
      adjusted += 0.15 // Gece akustik
      break
  }
  
  return Math.max(0.1, Math.min(0.9, adjusted))
}

// Hava durumu için instrumentalness ayarlama
function adjustInstrumentalness(baseInstrumental: number, weather: WeatherContext, timeEffect: TimeEffect): number {
  let adjusted = baseInstrumental
  
  if (timeEffect.timeOfDay === "night") {
    adjusted += 0.1 // Gece daha enstrümental
  }
  
  if (weather.condition === "foggy" || weather.condition === "cloudy-night") {
    adjusted += 0.15 // Sisli/bulutlu gece daha enstrümental
  }
  
  return Math.max(0.0, Math.min(0.8, adjusted))
}

// Hava durumu ile türleri genişletme
function enhanceGenresWithWeather(baseGenres: string[], weather: WeatherContext | null): string[] {
  const enhanced = [...baseGenres]
  
  if (!weather) return enhanced
  
  switch (weather.condition) {
    case "rainy":
      enhanced.push("jazz", "blues", "lo-fi", "indie")
      break
    case "clear":
      enhanced.push("pop", "dance", "electronic", "upbeat")
      break
    case "clear-night":
      enhanced.push("ambient", "chillout", "downtempo")
      break
    case "cloudy-night":
      enhanced.push("atmospheric", "post-rock", "ambient")
      break
    case "stormy":
      enhanced.push("alternative", "rock", "dramatic")
      break
  }
  
  return [...new Set(enhanced)] // Tekrarları kaldır
}

// Yaratıcı playlist isimleri
function generateCreativePlaylistName(): string {
  const creativeNames = [
    "Sessiz Anların Müziği",
    "İç Sesler ve Yankılar",
    "Düşüncelerin Melodisi", 
    "Huzurun Ritmi",
    "Duygusal Yolculuk",
    "Anın Sesi",
    "Kalbin Müziği",
    "Ruhsal Dengeleme",
    "Zihnin Sakinliği",
    "Duyguların Dansı",
    "İçsel Armoni",
    "Sessiz Çığlıklar",
    "Melankolinin İzleri",
    "Umudun Notaları",
    "Geçmişin Yankıları",
    "Geleceğin Fısıltıları"
  ]
  
  return creativeNames[Math.floor(Math.random() * creativeNames.length)]
}

export async function POST(request: NextRequest) {
  try {
    // Session kontrol et
    const session = await getServerSession(authOptions)
    const extendedSession = session as Session & { accessToken?: string }
    
    if (!session?.user?.email || !extendedSession.accessToken) {
      return NextResponse.json(
        { error: "Spotify giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Request body'yi parse et
    const { sessionId, includeTurkish = false, isPlaylistPrivate = true } = await request.json()

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
      moodScore: analysis.moodScore,
      hasWeatherData: !!analysis.environmentalContext?.weather
    })

    // Spotify API client oluştur
    const spotifyClient = createSpotifyClient({ accessToken: extendedSession.accessToken })

    // Test user profile
    let userProfile: { id: string; display_name: string }
    try {
      userProfile = await spotifyClient.getUserProfile()
      console.log('✅ Spotify getUserProfile() başarılı:', userProfile.display_name, userProfile.id)
    } catch (profileError) {
      console.error('❌ getUserProfile() başarısız:', profileError)
      return NextResponse.json(
        { error: "Spotify access token geçersiz. Lütfen çıkış yapıp tekrar giriş yapın." },
        { status: 401 }
      )
    }

    // HAVA DURUMU DESTEKLİ Audio features hesapla
    let audioFeatures = SpotifyAPI.calculateAudioFeatures(analysis)
    
    // Hava durumu verisi varsa audio features'ı ayarla
    if (analysis.environmentalContext?.weather) {
      const weather = analysis.environmentalContext.weather as WeatherContext
      const weatherMoodFactor = WeatherAPI.calculateMoodFactor(weather)
      const timeEffect = WeatherAPI.calculateTimeEffect()
      
      console.log('🌤️ Hava durumu verileri playlist\'e dahil ediliyor...', {
        condition: weather.condition,
        temperature: weather.temperature,
        energyModifier: weatherMoodFactor.energyModifier,
        valenceModifier: weatherMoodFactor.valenceModifier
      })
      
      // Audio features'ı hava durumuna göre ayarla
      audioFeatures = {
        ...audioFeatures,
        energy: Math.max(0.1, Math.min(0.9, audioFeatures.energy + (analysis.environmentalContext.energyModifier || 0))),
        valence: Math.max(0.1, Math.min(0.9, audioFeatures.valence + (analysis.environmentalContext.valenceModifier || 0))),
        tempo: adjustTempoForWeather(audioFeatures.tempo, weather, timeEffect),
        acousticness: adjustAcousticnessForWeather(audioFeatures.acousticness, weather),
        instrumentalness: adjustInstrumentalness(audioFeatures.instrumentalness, weather, timeEffect)
      }
      
      console.log('🎚️ Hava durumu ayarlı audio features:', audioFeatures)
    } else {
      console.log('🎚️ Standart audio features:', audioFeatures)
    }

    // HAVA DURUMU DESTEKLİ şarkı önerileri al
    let tracks: SpotifyTrack[] = []
    
    console.log('🎵 Hava durumu destekli playlist algoritması başlatılıyor...', { includeTurkish })
    
    try {
      // Çeşitli arama stratejileri ile şarkı topla
      tracks = await spotifyClient.searchTracksAdvanced({
        genres: enhanceGenresWithWeather(analysis.recommendedGenres, analysis.environmentalContext?.weather),
        audioFeatures,
        includeTurkish,
        limit: 50,
        weatherContext: analysis.environmentalContext?.weather
      })
      
      console.log(`🔍 Toplam ${tracks.length} şarkı bulundu (hava durumu faktörlü)`)
      
    } catch (searchError) {
      console.error('🚫 Search API başarısız:', searchError)
      return NextResponse.json(
        { error: "Spotify'dan şarkı alınamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      )
    }

    if (tracks.length === 0) {
      return NextResponse.json(
        { error: "Bu ruh haline uygun şarkı bulunamadı" },
        { status: 404 }
      )
    }

    // Gelişmiş şarkı filtreleme ve çeşitlilik algoritması
    const selectedTracks = SpotifyAPI.filterAndDiversifyTracks(tracks, {
      maxPerArtist: 2,
      minPopularity: 25,
      targetCount: 20,
      includeTurkish,
      weatherPreference: analysis.environmentalContext?.weather
    })

    console.log(`✨ ${selectedTracks.length} şarkı seçildi (${tracks.length} adetten)`)

    // Playlist adı ve açıklaması oluştur (konumdan bağımsız)
    const playlistName = analysis.playlistTheme || generateCreativePlaylistName()
    
    let playlistDescription = `${analysis.moodAnalysis.substring(0, 150)}...`
    
    // Hava durumu bilgisini açıklamaya ekle
    if (analysis.environmentalContext?.weather) {
      const weather = analysis.environmentalContext.weather as WeatherContext
      playlistDescription += ` 🌤️ ${weather.temperature}°C ${weather.description} hava koşulları dikkate alınarak oluşturuldu.`
    }
    
    playlistDescription += ` (MoodWeather AI)`

    // Spotify'da playlist oluştur
    const playlist = await spotifyClient.createPlaylist(
      userProfile.id,
      playlistName,
      playlistDescription,
      isPlaylistPrivate
    )

    console.log('📝 Playlist oluşturuldu:', playlist.name, playlist.id)

    // Şarkıları playlist'e ekle
    const trackUris = selectedTracks.map(track => track.uri)
    await spotifyClient.addTracksToPlaylist(playlist.id, trackUris)

    console.log('🎶 Şarkılar playlist\'e eklendi')

    // Playlist bilgilerini hesapla
    const totalDuration = selectedTracks.reduce((sum, track) => sum + track.duration_ms, 0)

    // Supabase'e playlist kaydını ekle
    const { error: insertError } = await supabase
      .from('playlist_history')
      .insert({
        user_id: moodSession.user_id,
        session_id: sessionId,
        playlist_name: playlistName,
        track_count: selectedTracks.length,
        total_duration: Math.round(totalDuration / 1000),
        average_energy: audioFeatures.energy,
        average_valence: audioFeatures.valence,
        average_tempo: audioFeatures.tempo,
        genres: analysis.recommendedGenres.join(', '),
        spotify_playlist_id: playlist.id,
        generated_at: new Date().toISOString(),
        play_count: 0
      })

    if (insertError) {
      console.error('Playlist history kaydetme hatası:', insertError)
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
        weatherEnhanced: !!analysis.environmentalContext?.weather,
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
      message: analysis.environmentalContext?.weather 
        ? "Hava durumu destekli playlist başarıyla oluşturuldu!"
        : "Playlist başarıyla oluşturuldu!"
    })

  } catch (error) {
    console.error('💥 Playlist oluşturma hatası:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    return NextResponse.json(
      { 
        error: "Playlist oluşturulurken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
