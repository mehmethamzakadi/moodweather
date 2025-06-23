// src/components/ui/weather-widget.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { WeatherData, WeatherAPI, weatherAPI } from "@/lib/weather/api"

interface WeatherWidgetProps {
  location?: string
  onWeatherChange?: (weather: WeatherData) => void
}

export default function WeatherWidget({ location, onWeatherChange }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useLocation, setUseLocation] = useState(false)
  
  // onWeatherChange'i ref olarak sakla (dependency döngüsünü önlemek için)
  const onWeatherChangeRef = useRef(onWeatherChange)
  onWeatherChangeRef.current = onWeatherChange
  
  // Fetch edilip edilmediğini track etmek için ref kullan
  const hasInitializedRef = useRef(false)

  // Hava durumu verisini al
  const fetchWeather = useCallback(async () => {
    // Eğer zaten yükleme varsa tekrar çağırma
    if (loading && hasInitializedRef.current) return
    
    setLoading(true)
    setError(null)

    try {
      let weatherData: WeatherData

      if (useLocation) {
        // GPS konum kullan
        try {
          const locationData = await WeatherAPI.getCurrentLocation()
          weatherData = await weatherAPI.getWeatherByCoordinates(
            locationData.latitude, 
            locationData.longitude
          )
          console.log('📍 GPS konumu kullanıldı:', locationData)
        } catch (locationError) {
          console.warn('GPS konum alınamadı, varsayılan şehir kullanılıyor:', locationError)
          weatherData = await weatherAPI.getWeatherByCity(location || "Istanbul")
        }
      } else {
        // Şehir adı kullan
        weatherData = await weatherAPI.getWeatherByCity(location || "Istanbul")
      }

      setWeather(weatherData)
      hasInitializedRef.current = true
      
      // onWeatherChange callback'ini güvenli şekilde çağır
      if (onWeatherChangeRef.current) {
        onWeatherChangeRef.current(weatherData)
      }
      
      console.log('🌤️ Hava durumu güncellendi:', weatherData)
    } catch (fetchError) {
      console.error('Hava durumu API hatası:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Hava durumu yüklenemedi')
      hasInitializedRef.current = true
    } finally {
      setLoading(false)
    }
  }, [location, useLocation, loading])

  // İlk yükleme - sadece bir kere çalışır
  useEffect(() => {
    if (!hasInitializedRef.current) {
      fetchWeather()
    }
  }, [fetchWeather])

  // Location değiştiğinde yeniden yükle
  useEffect(() => {
    hasInitializedRef.current = false
  }, [location])

  // Konum izni iste
  const requestLocation = async () => {
    try {
      setUseLocation(true)
      hasInitializedRef.current = false // Yeni fetch tetiklemek için reset
    } catch (requestError) {
      setError('Konum izni reddedildi')
      setUseLocation(false)
      console.error('Konum izni hatası:', requestError)
    }
  }

  // Manuel yenileme
  const handleRefresh = () => {
    hasInitializedRef.current = false // Yeni fetch tetiklemek için reset
    fetchWeather()
  }

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "clear":
        return "☀️"
      case "clear-night":
        return "🌙"
      case "cloudy":
        return "☁️"
      case "cloudy-night":
        return "☁️"
      case "rainy":
        return "🌧️"
      case "stormy":
        return "⛈️"
      case "snowy":
        return "❄️"
      case "drizzle":
        return "🌦️"
      case "foggy":
        return "🌫️"
      default:
        return "🌤️"
    }
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="h-8 w-8 bg-white/20 rounded-full"></div>
          </div>
          <div className="h-8 bg-white/20 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-3 bg-white/20 rounded"></div>
            <div className="h-3 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
        <div className="flex items-center justify-between mb-3">
          <p className="text-red-200 text-sm">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-red-300 hover:text-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        {!useLocation && (
          <button
            onClick={requestLocation}
            className="w-full bg-red-500/30 hover:bg-red-500/40 text-red-100 py-2 px-3 rounded-lg text-xs transition-colors"
          >
            📍 Konumumu Kullan
          </button>
        )}
      </div>
    )
  }

  if (!weather) return null

  const moodFactor = WeatherAPI.calculateMoodFactor(weather)
  const timeEffect = WeatherAPI.calculateTimeEffect()

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getWeatherIcon(weather.condition)}</span>
          <div>
            <h3 className="text-white font-medium text-sm flex items-center space-x-1">
              <span>{weather.location}</span>
              {useLocation && <span className="text-green-400">📍</span>}
            </h3>
            <p className="text-white/60 text-xs">{weather.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{weather.temperature}°</p>
          <p className="text-white/60 text-xs">{weather.country}</p>
        </div>
      </div>
      
      {/* Detaylar */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="flex items-center space-x-1">
          <span className="text-blue-400">💧</span>
          <span className="text-white/70">Nem: {weather.humidity}%</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-green-400">💨</span>
          <span className="text-white/70">Rüzgar: {weather.windSpeed} km/h</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-yellow-400">🌡️</span>
          <span className="text-white/70">Basınç: {weather.pressure} hPa</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-purple-400">👁️</span>
          <span className="text-white/70">Görüş: {weather.visibility} km</span>
        </div>
      </div>

      {/* Mood Etkisi */}
      <div className="bg-white/5 rounded-lg p-2 mb-3">
        <p className="text-white/80 text-xs font-medium mb-1">🎵 Müzik Etkisi:</p>
        <p className="text-white/70 text-xs">{moodFactor.description}</p>
        <p className="text-white/70 text-xs">{timeEffect.description}</p>
      </div>

      {/* Debug Info */}
      <div className="bg-white/5 rounded-lg p-2 mb-3 text-xs">
        <p className="text-white/60">Debug: {weather.condition} | Icon: {weather.icon}</p>
      </div>

      {/* Konum Butonu */}
      {!useLocation && (
        <button
          onClick={requestLocation}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Konumumu Kullan</span>
        </button>
      )}

      {/* Güncelleme Butonu */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-white/50 text-xs">
          {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={handleRefresh}
          className="text-white/60 hover:text-white/90 transition-colors"
          title="Yenile"
          disabled={loading}
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
