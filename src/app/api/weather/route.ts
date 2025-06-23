// src/app/api/weather/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface WeatherData {
  temperature: number
  condition: string
  description: string
  humidity: number
  windSpeed: number
  pressure: number
  visibility: number
  location: string
  country: string
  timezone: string
  icon: string
  sunrise: number
  sunset: number
  coordinates: {
    lat: number
    lon: number
  }
}

interface OpenWeatherResponse {
  main: {
    temp: number
    humidity: number
    pressure: number
  }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  wind: {
    speed: number
  }
  visibility?: number
  name: string
  sys: {
    country: string
    sunrise: number
    sunset: number
  }
  timezone: number
  coord: {
    lat: number
    lon: number
  }
}

function getConditionFromCodeAndIcon(code: number, icon: string): string {
  // Icon'a göre gece/gündüz kontrolü
  const isNight = icon.endsWith('n')
  
  if (code >= 200 && code < 300) return "stormy"
  if (code >= 300 && code < 400) return "drizzle"
  if (code >= 500 && code < 600) return "rainy"
  if (code >= 600 && code < 700) return "snowy"
  if (code >= 700 && code < 800) return "foggy"
  if (code === 800) {
    // Clear sky - gece/gündüz ayrımı
    return isNight ? "clear-night" : "clear"
  }
  if (code > 800) {
    // Cloudy - gece/gündüz ayrımı  
    return isNight ? "cloudy-night" : "cloudy"
  }
  return "unknown"
}

function transformWeatherData(data: OpenWeatherResponse): WeatherData {
  return {
    temperature: Math.round(data.main.temp),
    condition: getConditionFromCodeAndIcon(data.weather[0].id, data.weather[0].icon),
    description: data.weather[0].description,
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    pressure: data.main.pressure,
    visibility: data.visibility ? Math.round(data.visibility / 1000) : 10, // meters to km
    location: data.name,
    country: data.sys.country,
    timezone: data.timezone.toString(),
    icon: data.weather[0].icon,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    coordinates: {
      lat: data.coord.lat,
      lon: data.coord.lon
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const city = searchParams.get('city')

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenWeather API key not configured' },
        { status: 500 }
      )
    }

    const baseUrl = 'https://api.openweathermap.org/data/2.5'
    let url: string

    if (lat && lon) {
      // Koordinatlara göre
      url = `${baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=tr`
    } else if (city) {
      // Şehir adına göre
      url = `${baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=tr`
    } else {
      return NextResponse.json(
        { error: 'Koordinat veya şehir adı gerekli' },
        { status: 400 }
      )
    }

    console.log('Fetching weather from:', url.replace(apiKey, 'HIDDEN'))

    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Weather API Error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Weather API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const weatherData = transformWeatherData(data)

    console.log('Weather icon:', data.weather[0].icon, 'Condition:', weatherData.condition)

    return NextResponse.json(weatherData)
  } catch (error) {
    console.error('Weather API Error:', error)
    return NextResponse.json(
      { error: 'Hava durumu verileri alınamadı' },
      { status: 500 }
    )
  }
}
