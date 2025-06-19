// src/app/auth/signin/page.tsx
"use client"

import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SignIn() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Eğer zaten giriş yapmışsa ana sayfaya yönlendir
    getSession().then((session) => {
      if (session) {
        router.push("/dashboard")
      }
    })
  }, [router])

  const handleSpotifySignIn = async () => {
    if (loading) return // Double-click koruması
    
    setLoading(true)
    try {
      console.log('Spotify login başlatılıyor...')
      const result = await signIn("spotify", { 
        callbackUrl: "/dashboard",
        redirect: true 
      })
      console.log('SignIn result:', result)
    } catch (error) {
      console.error("Sign in error:", error)
      setLoading(false)
    }
    // Loading state'i burada false yapmıyoruz çünkü redirect olacak
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">MoodWeather</h1>
          <p className="text-gray-600">
            Ruh halinize ve hava durumuna uygun müzik deneyimi
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSpotifySignIn}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Spotify ile Giriş Yap</span>
              </>
            )}
          </button>

          <div className="text-xs text-gray-500 text-center">
            Spotify hesabınıza güvenli şekilde bağlanıyoruz. 
            Kişisel bilgileriniz korunur.
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600 space-y-2">
            <h3 className="font-semibold">Özellikler:</h3>
            <ul className="space-y-1 text-xs">
              <li>• Ruh halinize göre müzik önerileri</li>
              <li>• Hava durumu entegrasyonu</li>
              <li>• AI destekli playlist oluşturma</li>
              <li>• Kişiselleştirilmiş terapi seansları</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}