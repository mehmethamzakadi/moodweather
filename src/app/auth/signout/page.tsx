// src/app/auth/signout/page.tsx
"use client"

import { signOut, useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SignOut() {
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      // Tüm cookie'leri temizle
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
      })

      // NextAuth signOut
      await signOut({
        redirect: false,
        callbackUrl: "/"
      })

      // Local storage temizle (varsa)
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }

      // Ana sayfaya yönlendir
      window.location.href = "/"
    } catch (error) {
      console.error('SignOut error:', error)
      setIsSigningOut(false)
    }
  }

  useEffect(() => {
    // Eğer session yoksa zaten ana sayfaya yönlendir
    if (!session) {
      router.push("/")
    }
  }, [session, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">Çıkış Yap</h1>
        
        {session ? (
          <>
            <p className="text-gray-600 mb-6">
              Merhaba <strong>{session.user?.name || session.user?.email}</strong>, 
              MoodWeather'dan çıkış yapmak istediğinizden emin misiniz?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isSigningOut ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Çıkış yapılıyor...</span>
                  </>
                ) : (
                  <span>Evet, Çıkış Yap</span>
                )}
              </button>
              
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                İptal Et
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Çıkış yaptığınızda tüm oturum bilgileriniz temizlenecek ve 
                tekrar giriş yapmak için Spotify yetkilendirmesi gerekecektir.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Zaten çıkış yapmışsınız.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        )}
      </div>
    </div>
  )
}