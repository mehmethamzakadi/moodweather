// src/components/dashboard/StatsPanel.tsx
"use client"

import Card from "@/components/ui/card"
import WeatherWidget from "@/components/ui/weather-widget"
import { WeatherData } from "@/lib/weather/api"

interface StatsPanelProps {
  currentWeather: WeatherData | null
  onWeatherChange: (weather: WeatherData) => void
}

export default function StatsPanel({ currentWeather, onWeatherChange }: StatsPanelProps) {
  const getWeatherInfluenceText = (weather: WeatherData | null) => {
    if (!weather) return "Hava durumu bilgisi yükleniyor..."
    
    if (weather.temperature > 25) return "Sıcak hava enerjik müzikler önerir"
    if (weather.temperature < 10) return "Soğuk hava sakin müzikler önerir"
    return "Ilıman hava dengeli müzikler önerir"
  }

  const statsItems = [
    {
      title: "Spotify Bağlantısı",
      value: "Aktif",
      color: "green",
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.66 0-.479.359-.78.719-.84 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.299 1.02v.061zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      )
    },
    {
      title: "Mood Seansları",
      value: "0",
      color: "blue",
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      )
    },
    {
      title: "Oluşturulan Playlistler",
      value: "0",
      color: "purple",
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Weather Widget */}
      <WeatherWidget 
        location="İstanbul"
        onWeatherChange={onWeatherChange}
      />

      {/* Stats Cards */}
      <div className="space-y-4">
        {statsItems.map((stat) => (
          <Card key={stat.title} variant="glass" padding="md" hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">{stat.title}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 bg-${stat.color}-500/30 rounded-full flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weather Influence Info */}
      {currentWeather && (
        <Card variant="gradient" padding="md">
          <h4 className="text-white font-medium mb-2 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Hava Durumu Etkisi</span>
          </h4>
          <p className="text-white/80 text-sm">
            {getWeatherInfluenceText(currentWeather)}
          </p>
        </Card>
      )}
    </div>
  )
}