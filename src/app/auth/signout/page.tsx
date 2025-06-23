// src/app/auth/signout/page.tsx
"use client"

import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SignOut() {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(true)

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut({ 
          callbackUrl: "/",
          redirect: false 
        })
        
        // Kısa bir gecikme sonrası ana sayfaya yönlendir
        setTimeout(() => {
          router.push("/")
        }, 1500)
        
      } catch (error) {
        console.error('Sign out error:', error)
        setIsSigningOut(false)
      }
    }

    handleSignOut()
  }, [router])

  const handleManualSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({ 
        callbackUrl: "/",
        redirect: true 
      })
    } catch (error) {
      console.error('Manual sign out error:', error)
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl text-center">
        {isSigningOut ? (
          <>
            {/* Loading Animation */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-full h-full border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-transparent border-t-pink-300 rounded-full animate-spin animation-delay-150"></div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-4">Çıkış Yapılıyor...</h1>
            <p className="text-pink-200 mb-6">
              Spotify oturumunuz sonlandırılıyor. Teşekkür ederiz!
            </p>
            
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <p className="text-white/80 text-sm">
                ✨ MoodWeather kullandığınız için teşekkürler
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Error State */}
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-4">Çıkış Sorunu</h1>
            <p className="text-pink-200 mb-6">
              Çıkış işlemi sırasında bir sorun oluştu.
            </p>

            <button
              onClick={handleManualSignOut}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              Tekrar Dene
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
            >
              Ana Sayfaya Dön
            </button>
          </>
        )}
      </div>
    </div>
  )
}
