// src/app/dashboard/page.tsx
"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { WeatherData } from "@/lib/weather/api"
import { DashboardService } from "@/lib/dashboard/services"

// Components
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import MoodInputForm from "@/components/dashboard/MoodInputForm"
import PlaylistSettings from "@/components/dashboard/PlaylistSettings"
import StatsPanel from "@/components/dashboard/StatsPanel"
import DebugInfo from "@/components/dashboard/DebugInfo"

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Yükleniyor...</p>
      </div>
    </div>
  )
}

// Main Dashboard component
export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State management
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [includeTurkish, setIncludeTurkish] = useState(false)
  const [isPlaylistPrivate, setIsPlaylistPrivate] = useState(true)
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)

  // Authentication effect
  useEffect(() => {
    console.log('Dashboard - Session status:', status)
    console.log('Dashboard - Session data:', session)
    
    if (status === "unauthenticated") {
      console.log('Kullanıcı unauthenticated, signin\'e yönlendiriliyor...')
      router.push("/auth/signin")
    }
  }, [status, router, session])

  // Mood submission handler
  const handleMoodSubmit = async (mood: string) => {
    if (!DashboardService.validateMoodInput(mood) || isAnalyzing) return

    setIsAnalyzing(true)
    try {
      const submissionData = DashboardService.buildSubmissionData(
        mood,
        currentWeather,
        includeTurkish,
        isPlaylistPrivate
      )

      const result = await DashboardService.submitMoodAnalysis(submissionData)
      
      console.log('New analysis completed:', result)
      router.push(`/mood/results/${result.sessionId}`)
      
    } catch (error) {
      console.error('Mood analiz hatası:', error)
      alert('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Weather change handler
  const handleWeatherChange = (weather: WeatherData) => {
    setCurrentWeather(weather)
    console.log('Hava durumu güncellendi:', weather)
  }

  // Loading state
  if (status === "loading") {
    return <LoadingScreen />
  }

  // Unauthenticated state
  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
      {/* Header */}
      <DashboardHeader session={session} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Panel - Mood Input & Settings */}
          <div className="lg:col-span-2 space-y-6">
            <MoodInputForm 
              onSubmit={handleMoodSubmit}
              isAnalyzing={isAnalyzing}
            />
            
            <PlaylistSettings
              includeTurkish={includeTurkish}
              setIncludeTurkish={setIncludeTurkish}
              isPlaylistPrivate={isPlaylistPrivate}
              setIsPlaylistPrivate={setIsPlaylistPrivate}
            />
          </div>

          {/* Right Panel - Weather & Stats */}
          <div>
            <StatsPanel
              currentWeather={currentWeather}
              onWeatherChange={handleWeatherChange}
            />
          </div>
        </div>

        {/* Debug Information */}
        <DebugInfo 
          session={session}
          currentWeather={currentWeather}
        />
      </main>
    </div>
  )
}