// src/app/page.tsx
"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentMoodIndex, setCurrentMoodIndex] = useState(0)
  const [currentWeatherIndex, setCurrentWeatherIndex] = useState(0)

  // Animasyonlu mood ve hava durumu örnekleri
  const moods = ["😴 Yorgun", "😰 Stresli", "😊 Mutlu", "😔 Melankolik", "⚡ Enerjik", "🧘 Huzurlu"]
  const weathers = ["☀️ Güneşli", "🌧️ Yağmurlu", "❄️ Karlı", "⛅ Bulutlu", "🌈 Renkli", "🌙 Gecelik"]

  useEffect(() => {
    console.log('Session status:', status)
    console.log('Session data:', session)
    
    if (status === "authenticated" && session) {
      console.log('Kullanıcı authenticated, dashboard\'a yönlendiriliyor...')
      router.push("/dashboard")
    }
  }, [session, status, router])

  useEffect(() => {
    const moodInterval = setInterval(() => {
      setCurrentMoodIndex((prev) => (prev + 1) % moods.length)
    }, 2000)

    const weatherInterval = setInterval(() => {
      setCurrentWeatherIndex((prev) => (prev + 1) % weathers.length)
    }, 2500)

    return () => {
      clearInterval(moodInterval)
      clearInterval(weatherInterval)
    }
  }, [moods.length, weathers.length])

  const handleSpotifyLogin = () => {
    if (status === "loading") return
    
    console.log('Spotify login başlatılıyor (127.0.0.1 mode)...')
    
    // Complete refresh - önceki session'ı temizle
    signIn("spotify", { 
      callbackUrl: "http://127.0.0.1:3000/dashboard",
      // Force yeniden authorization
      redirect: true
    })
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Music Notes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute text-white/10 text-2xl animate-bounce`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            ♪
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Logo & Title */}
        <div className="mb-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <div className="relative">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            MoodWeather
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-200 max-w-2xl mx-auto leading-relaxed">
            Ruh halinize ve hava durumuna uygun 
            <span className="text-yellow-300 font-semibold"> AI destekli </span>
            müzik deneyimi
          </p>
        </div>

        {/* Interactive Demo */}
        <div className="mb-12 bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl max-w-4xl w-full">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Nasıl Çalışır?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                1
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Mood Girişi</h3>
              <div className="bg-white/10 rounded-xl p-4 mb-2 border border-white/20">
                <p className="text-blue-200 text-sm">Şu an hissediyorum:</p>
                <p className="text-white text-lg font-semibold transition-all duration-500">
                  {moods[currentMoodIndex]}
                </p>
              </div>
              <p className="text-blue-200 text-sm">Ruh halinizi basitçe yazın</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                2
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Hava Durumu</h3>
              <div className="bg-white/10 rounded-xl p-4 mb-2 border border-white/20">
                <p className="text-blue-200 text-sm">İstanbul&apos;da:</p>
                <p className="text-white text-lg font-semibold transition-all duration-500">
                  {weathers[currentWeatherIndex]}
                </p>
              </div>
              <p className="text-blue-200 text-sm">Otomatik konum tespiti</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                3
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Playlist</h3>
              <div className="bg-white/10 rounded-xl p-4 mb-2 border border-white/20">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-200"></div>
                </div>
                <p className="text-white text-sm mt-2">Playlist oluşturuluyor...</p>
              </div>
              <p className="text-blue-200 text-sm">Kişiselleştirilmiş müzik</p>
            </div>
          </div>
          
          {/* Arrow Animation */}
          <div className="flex justify-center items-center mt-8 space-x-4">
            <div className="w-8 h-8 text-white/60 animate-bounce">➜</div>
            <div className="w-8 h-8 text-white/60 animate-bounce delay-300">➜</div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
          {[
            { icon: "🤖", title: "AI Destekli", desc: "Akıllı müzik önerileri" },
            { icon: "🌤️", title: "Hava Entegrasyonu", desc: "Gerçek zamanlı hava verileri" },
            { icon: "🎵", title: "Spotify Bağlantısı", desc: "Doğrudan playlist oluşturma" },
            { icon: "📊", title: "Kişiselleştirme", desc: "Zevklerinizi öğrenir" }
          ].map((feature, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-blue-200 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <button
            onClick={handleSpotifyLogin}
            className="group relative bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white text-lg font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span>Spotify ile Başla</span>
              <div className="group-hover:translate-x-1 transition-transform duration-300">→</div>
            </div>
            
            {/* Animated border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
          
          <p className="text-blue-200 text-sm mt-4 max-w-md mx-auto">
            Spotify hesabınızla güvenli giriş yapın. Kişisel verileriniz korunur.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-blue-300/60 text-sm">
            Yapay zeka destekli müzik terapi deneyimi • Ücretsiz
          </p>
        </div>
      </div>
    </div>
  )
}