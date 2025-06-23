// src/app/mood/results/[sessionId]/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"

interface MoodAnalysis {
  moodAnalysis: string
  targetMood: string
  moodScore: number
  musicStrategy: string
  playlistTheme: string
  recommendedGenres: string[]
  energyLevel: string
  valence: string
  recommendations: string[]
}

interface MoodSession {
  id: string
  currentMood: string
  targetMood: string
  moodScore: number
  aiAnalysis: string
  playlistStrategy: string
  sessionDate: string
  includeTurkish: boolean
  isPlaylistPrivate: boolean
}

export default function MoodResults({ params }: { params: Promise<{ sessionId: string }> }) {
  const { status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [moodSession, setMoodSession] = useState<MoodSession | null>(null)
  const [analysis, setAnalysis] = useState<MoodAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>("")
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [playlistCreated, setPlaylistCreated] = useState(false)
  const [playlistData, setPlaylistData] = useState<{
    tracks: Array<{
      id: string;
      name: string;
      artist: string;
      album: string;
      image: string;
      spotifyUrl: string;
      duration: number;
    }>;
    spotifyUrl: string;
    name: string;
  } | null>(null)

  useEffect(() => {
    // Params'ı await et
    const getSessionId = async () => {
      const resolvedParams = await params
      setSessionId(resolvedParams.sessionId)
    }
    getSessionId()
  }, [params])

  const fetchMoodSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/mood/session/${sessionId}`)
      
      if (!response.ok) {
        throw new Error('Session bulunamadı')
      }

      const data = await response.json()
      setMoodSession(data.session)
      setAnalysis(JSON.parse(data.session.aiAnalysis))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && sessionId) {
      fetchMoodSession()
    }
  }, [status, sessionId, fetchMoodSession, router])

  const createPlaylist = async () => {
    if (!sessionId || isCreatingPlaylist) return

    setIsCreatingPlaylist(true)
    try {
      // Session'dan kullanıcı tercihlerini al
      const includeTurkish = moodSession?.includeTurkish || false
      const isPlaylistPrivate = moodSession?.isPlaylistPrivate !== false // varsayılan true
      
      console.log('🎧 Playlist oluşturuluyor...', { sessionId, includeTurkish, isPlaylistPrivate })
      
      const response = await fetch('/api/playlist/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId,
          includeTurkish,
          isPlaylistPrivate
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Playlist oluşturulamadı')
      }

      const data = await response.json()
      setPlaylistCreated(true)
      setPlaylistData({
        tracks: data.playlist.tracks,
        spotifyUrl: data.playlist.spotifyUrl,
        name: data.playlist.name
      })
      
      // Başarı bildirimi - gizlilik durumuna göre
      const privacyText = isPlaylistPrivate ? '🔒 gizli' : '🌍 herkese açık'
      alert(`✨ Playlist başarıyla oluşturuldu! "${data.playlist.name}" adlı ${privacyText} playlist ${data.playlist.trackCount} şarkı içeriyor.`)
      
    } catch (err) {
      console.error('Playlist oluşturma hatası:', err)
      alert(err instanceof Error ? err.message : 'Playlist oluşturulurken bir hata oluştu')
    } finally {
      setIsCreatingPlaylist(false)
    }
  }



  const getMoodEmoji = (score: number) => {
    if (score <= 2) return "😔"
    if (score <= 4) return "😐"
    if (score <= 6) return "🙂"
    if (score <= 8) return "😊"
    return "😄"
  }

  const getEnergyColor = (level: string) => {
    switch (level) {
      case "low": return "from-blue-500 to-purple-600"
      case "medium": return "from-green-500 to-blue-600"
      case "high": return "from-yellow-500 to-red-600"
      default: return "from-gray-500 to-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Analiz sonuçları yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !moodSession || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sonuç Bulunamadı</h1>
          <p className="text-gray-600 mb-6">{error || "Analiz sonuçları yüklenemedi"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">Mood Analizi</h1>
            </div>
            <div className="text-white text-right">
              <p className="text-sm opacity-80">Analiz Tarihi</p>
              <p className="font-semibold">{new Date(moodSession.sessionDate).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mood Score Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20 text-center">
          <div className="text-6xl mb-4">{getMoodEmoji(analysis.moodScore)}</div>
          <h2 className="text-3xl font-bold text-white mb-2">Mood Skoru: {analysis.moodScore}/10</h2>
          <p className="text-xl text-white/80">{analysis.targetMood}</p>
        </div>

        {/* Original Mood */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-3">🎭 Girdiğin Mood</h3>
          <p className="text-white/90 bg-white/10 rounded-lg p-4 italic">
            &quot;{moodSession.currentMood}&quot;
          </p>
        </div>

        {/* AI Analysis */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">🤖 AI Analizi</h3>
          <p className="text-white/90 leading-relaxed">{analysis.moodAnalysis}</p>
        </div>

        {/* Music Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">🎵 Müzik Stratejisi</h3>
            <p className="text-white/90 mb-4">{analysis.musicStrategy}</p>
            <div className={`bg-gradient-to-r ${getEnergyColor(analysis.energyLevel)} rounded-lg p-3 text-center`}>
              <p className="text-white font-semibold">Enerji Seviyesi: {analysis.energyLevel.toUpperCase()}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">🎨 Playlist Teması</h3>
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-4 text-center mb-4">
              <p className="text-white text-lg font-semibold">{analysis.playlistTheme}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendedGenres.map((genre, index) => (
                <span key={index} className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">💡 Öneriler</h3>
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">{index + 1}</span>
                </div>
                <p className="text-white/90">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button 
            onClick={createPlaylist}
            disabled={isCreatingPlaylist || playlistCreated}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
          >
            {isCreatingPlaylist ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Playlist Oluşturuluyor...</span>
              </>
            ) : playlistCreated ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Playlist Oluşturuldu!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Spotify Playlist Oluştur</span>
              </>
            )}
          </button>

          {playlistCreated && playlistData && (
            <a 
              href={playlistData.spotifyUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Spotify&apos;da Aç</span>
            </a>
          )}

          {!playlistCreated && (
            <button 
              onClick={() => router.push("/dashboard")}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Yeni Analiz Yap</span>
            </button>
          )}
        </div>

        {/* Playlist Tracks Display */}
        {playlistCreated && playlistData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h3 className="text-2xl font-semibold text-white flex items-center space-x-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>{playlistData.name}</span>
              </h3>
              <div className="flex items-center space-x-2">
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                  {playlistData.tracks.length} şarkı
                </span>
                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  <span>Özel</span>
                </span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {playlistData.tracks.map((track, index) => (
                <div key={track.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    
                    {track.image && (
                      <Image 
                        src={track.image} 
                        alt={track.album}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-md object-cover"
                        unoptimized // Spotify resimlerini optimize etme
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{track.name}</h4>
                      <p className="text-white/70 text-sm truncate">{track.artist}</p>
                      <p className="text-white/50 text-xs truncate">{track.album}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-white/60 text-sm">
                        {Math.floor(track.duration / 60000)}:{String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}
                      </span>
                      <a 
                        href={track.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded-full transition-colors"
                        title="Spotify'da Aç"
                      >
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}