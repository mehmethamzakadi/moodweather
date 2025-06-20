// src/app/auth/error/page.tsx
"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")
  const [currentUrl, setCurrentUrl] = useState<string>("")

  // Client-side only URL setting
  useEffect(() => {
    setCurrentUrl(window.location.href)
  }, [])

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "OAuthCallback":
        return "Spotify giriş işlemi sırasında bir hata oluştu"
      case "AccessDenied":
        return "Spotify erişimi reddedildi"
      case "Verification":
        return "E-posta doğrulama hatası"
      default:
        return "Beklenmeyen bir hata oluştu"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Giriş Hatası</h1>
          <p className="text-gray-600 mb-4">
            {getErrorMessage(error)}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Hata Detayları:</h3>
          <p className="text-sm text-red-700 mb-1">
            <strong>Hata Kodu:</strong> {error || "Bilinmiyor"}
          </p>
          {errorDescription && (
            <p className="text-sm text-red-700 mb-1">
              <strong>Açıklama:</strong> {errorDescription}
            </p>
          )}
          <p className="text-sm text-red-700">
            <strong>Current URL:</strong> {currentUrl || "Loading..."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.href = "/auth/signin"}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Tekrar Dene
          </button>
          
          <button
            onClick={() => window.location.href = "/"}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Ana Sayfaya Dön
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">Olası Çözümler:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Spotify hesabınızın aktif olduğundan emin olun</li>
            <li>• Tarayıcınızın çerezleri kabul ettiğinden emin olun</li>
            <li>• Farklı bir tarayıcı deneyin</li>
            <li>• VPN kullanıyorsanız kapatın</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}