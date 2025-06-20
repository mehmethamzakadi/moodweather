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
      console.log('🔴 AGRESİF SIGN OUT BAŞLATILIYOR...')
      
      // 1. NextAuth signOut - redirect: false
      console.log('1. NextAuth signOut çağrılıyor...')
      await signOut({
        redirect: false,
        callbackUrl: "/"
      })
      console.log('✅ NextAuth signOut tamamlandı')
      
      // 1.5. Server-side force logout
      console.log('1.5. Server-side session temizleniyor...')
      try {
        await fetch('/api/auth/force-logout', {
          method: 'POST'
        })
        console.log('✅ Server-side session temizlendi')
      } catch (e) {
        console.log('⚠️ Server-side temizleme hatası:', e)
      }
      
      // 2. Browser storage temizliği
      if (typeof window !== 'undefined') {
        console.log('2. Storage temizleme başlatılıyor...')
        
        try {
          localStorage.clear()
          sessionStorage.clear()
          console.log('✅ Storage temizlendi')
        } catch (e) {
          console.log('❌ Storage temizleme hatası:', e)
        }
        
        // 3. NextAuth cookie'lerini özel olarak hedefle
        const nextAuthCookies = [
          'next-auth.session-token',
          'next-auth.csrf-token', 
          'next-auth.callback-url',
          'next-auth.state',
          '__Secure-next-auth.session-token',
          '__Host-next-auth.csrf-token'
        ]
        
        console.log('3. NextAuth cookie\'leri temizleniyor...')
        nextAuthCookies.forEach(cookieName => {
          // Farklı path ve domain kombinasyonları
          const deleteConfigs = [
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api/auth;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api/auth; domain=localhost;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax;`,
            `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; SameSite=Lax;`
          ]
          
          deleteConfigs.forEach(config => {
            document.cookie = config
          })
          
          console.log(`✅ ${cookieName} temizlendi`)
        })
        
        // 4. Tüm diğer cookie'leri de temizle
        console.log('4. Tüm cookie\'ler kontrol ediliyor...')
        const allCookies = document.cookie.split(';')
        
        allCookies.forEach(cookie => {
          const cookieName = cookie.split('=')[0].trim()
          if (cookieName) {
            const deleteConfigs = [
              `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`,
              `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost;`,
              `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost;`,
              `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/api/auth;`
            ]
            
            deleteConfigs.forEach(config => {
              document.cookie = config
            })
          }
        })
        
        console.log('✅ Tüm cookie\'ler temizlendi')
        
        // 5. Cookie'lerin gerçekten temizlendiğini kontrol et
        setTimeout(() => {
          const remainingCookies = document.cookie
          console.log('Kalan cookie\'ler:', remainingCookies)
          
          if (remainingCookies.includes('next-auth')) {
            console.log('⚠️ NextAuth cookie\'leri hala var!')
          } else {
            console.log('✅ NextAuth cookie\'leri tamamen temizlendi')
          }
        }, 100)
      }
      
      // 6. Spotify session'ı da sonlandır
      console.log('6. Spotify session sonlandırılıyor...')
      try {
        // Spotify logout endpoint'ıne istek gönder
        const spotifyLogoutUrl = 'https://accounts.spotify.com/logout'
        
        // Yeni tab'da açıp kapat (session sonlandırma için)
        const logoutWindow = window.open(spotifyLogoutUrl, '_blank', 'width=1,height=1')
        setTimeout(() => {
          if (logoutWindow) {
            logoutWindow.close()
          }
        }, 1000)
        
        console.log('✅ Spotify logout request gönderildi')
      } catch (e) {
        console.log('⚠️ Spotify logout isteği başarısız:', e)
      }
      
      // 7. Sayfayı tamamen yenile (cache bypass)
      console.log('5. Sayfa yenileniyor...')
      setTimeout(() => {
        window.location.href = "/?t=" + Date.now() // Timestamp ile cache bypass
      }, 200)
      
    } catch (error) {
      console.error('❌ SignOut error:', error)
      setIsSigningOut(false)
      // Hata durumunda da sayfayı yenile
      window.location.href = "/?error=signout"
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
              MoodWeather&apos;dan çıkış yapmak istediğinizden emin misiniz?
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