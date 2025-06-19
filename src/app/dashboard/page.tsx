// src/app/dashboard/page.tsx
"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [moodInput, setMoodInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moodInput.trim() || isAnalyzing) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/mood/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: moodInput.trim(),
          location: "Istanbul" // Şimdilik sabit, sonra GPS ekleriz
        }),
      })

      if (!response.ok) {
        throw new Error('Analiz başarısız')
      }

      const result = await response.json()
      setLastAnalysis(result)
      setMoodInput("")
      
      // Başarılı analiz sonrası results sayfasına yönlendir
      router.push(`/mood/results/${result.sessionId}`)
      
    } catch (error) {
      console.error('Mood analiz hatası:', error)
      alert('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">{/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">MoodWeather</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-white text-right">
                <p className="text-sm opacity-80">Hoş geldin,</p>
                <p className="font-semibold">{session.user?.name || session.user?.email}</p>
              </div>
              {session.user?.image && (
                <img 
                  src={session.user.image} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full border-2 border-white/30"
                />
              )}
              <button
                onClick={() => router.push("/auth/signout")}
                className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mood Input Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              🎭 Ruh Halin Nasıl?
            </h2>
            <p className="text-white/80 text-lg">
              Şu anki hislerini bizimle paylaş, sana uygun müzik önerelim
            </p>
          </div>

          <form onSubmit={handleMoodSubmit} className="max-w-2xl mx-auto">
            <div className="space-y-6">
              <div>
                <label htmlFor="mood" className="block text-white font-medium mb-3">
                  Bugün kendini nasıl hissediyorsun?
                </label>
                <textarea
                  id="mood"
                  value={moodInput}
                  onChange={(e) => setMoodInput(e.target.value)}
                  placeholder="Örnek: Yorgun ve stresli hissediyorum, biraz dinlenmek istiyorum..."
                  className="w-full h-32 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-200 resize-none"
                  disabled={isAnalyzing}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <button
                  type="submit"
                  disabled={!moodInput.trim() || isAnalyzing}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Analiz Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>AI Analizi Başlat</span>
                    </>
                  )}
                </button>
                
                <div className="text-white/60 text-sm text-center sm:text-left">
                  ✨ AI destekli kişiselleştirilmiş müzik önerileri
                </div>
              </div>
            </div>
          </form>

          {/* Quick Mood Buttons */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-white/80 text-center mb-4">Ya da hızlı seçim yap:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { emoji: "😴", text: "Yorgun", mood: "Çok yorgun ve dinlenmeye ihtiyacım var" },
                { emoji: "😰", text: "Stresli", mood: "Stresli hissediyorum, sakinleşmek istiyorum" },
                { emoji: "😊", text: "Mutlu", mood: "Kendimi harika hissediyorum, enerjik müzikler dinlemek istiyorum" },
                { emoji: "😔", text: "Melankolik", mood: "Biraz melankolik hissediyorum, duygusal müzikler dinlemek istiyorum" },
                { emoji: "⚡", text: "Enerjik", mood: "Çok enerjik hissediyorum, dans edebileceğim müzikler istiyorum" },
                { emoji: "🧘", text: "Huzurlu", mood: "Huzurlu ve sakin hissediyorum, rahatlatıcı müzikler dinlemek istiyorum" },
              ].map((quickMood) => (
                <button
                  key={quickMood.text}
                  onClick={() => setMoodInput(quickMood.mood)}
                  disabled={isAnalyzing}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center space-x-2"
                >
                  <span className="text-lg">{quickMood.emoji}</span>
                  <span className="text-sm">{quickMood.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Spotify Bağlantısı</p>
                <p className="text-2xl font-bold text-white">Aktif</p>
              </div>
              <div className="w-12 h-12 bg-green-500/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Mood Seansları</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Oluşturulan Playlistler</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Session Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">🔧 Debug Bilgileri</h3>
            <pre className="text-green-300 text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}