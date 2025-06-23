// src/lib/weather/api.ts
export interface WeatherData {
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
  uvIndex?: number
  coordinates: {
    lat: number
    lon: number
  }
}

export interface LocationData {
  latitude: number
  longitude: number
  city?: string
  country?: string
}

export class WeatherAPI {
  // Koordinatlara göre hava durumu al (Server-side API üzerinden)
  async getWeatherByCoordinates(lat: number, lon: number): Promise<WeatherData> {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Weather API error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Weather API Error:', error)
      throw new Error('Hava durumu verileri alınamadı')
    }
  }

  // Şehir adına göre hava durumu al (Server-side API üzerinden)
  async getWeatherByCity(city: string): Promise<WeatherData> {
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Weather API error: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Weather API Error:', error)
      throw new Error('Hava durumu verileri alınamadı')
    }
  }

  // Hava durumuna göre mood faktörü hesapla (Gece/gündüz duyarlı)
  static calculateMoodFactor(weather: WeatherData): {
    energyModifier: number
    valenceModifier: number
    description: string
  } {
    let energyModifier = 0
    let valenceModifier = 0
    let description = ""

    // Sıcaklık etkisi
    if (weather.temperature > 25) {
      energyModifier += 0.2
      valenceModifier += 0.1
      description += "Sıcak hava enerjinizi artırıyor. "
    } else if (weather.temperature < 5) {
      energyModifier -= 0.3
      valenceModifier -= 0.2
      description += "Soğuk hava sakinleştirici etki yapıyor. "
    } else if (weather.temperature < 15) {
      energyModifier -= 0.1
      description += "Serin hava dinlendirici. "
    }

    // Hava durumu etkisi (Gece/gündüz duyarlı)
    switch (weather.condition) {
      case "clear":
        valenceModifier += 0.3
        energyModifier += 0.2
        description += "Güneşli hava ruh halinizi yükseltiyor. "
        break
      case "clear-night":
        valenceModifier += 0.1
        energyModifier -= 0.1
        description += "Açık gece gökyüzü huzur verici. "
        break
      case "cloudy":
        valenceModifier -= 0.1
        energyModifier -= 0.1
        description += "Bulutlu hava sakin müzikler öneriyor. "
        break
      case "cloudy-night":
        valenceModifier -= 0.2
        energyModifier -= 0.2
        description += "Bulutlu gece sakin ve melankolik müzikler için ideal. "
        break
      case "rainy":
        valenceModifier -= 0.2
        energyModifier -= 0.3
        description += "Yağmurlu hava melankolik müzikler için ideal. "
        break
      case "stormy":
        energyModifier += 0.1
        valenceModifier -= 0.3
        description += "Fırtınalı hava güçlü müzikler öneriyor. "
        break
      case "snowy":
        valenceModifier += 0.1
        energyModifier -= 0.2
        description += "Karlı hava huzurlu müzikler için güzel. "
        break
      case "drizzle":
        valenceModifier -= 0.1
        energyModifier -= 0.2
        description += "Çiseleme yağmur sakin müzikler öneriyor. "
        break
      case "foggy":
        valenceModifier -= 0.1
        energyModifier -= 0.2
        description += "Sisli hava gizemli müzikler için uygun. "
        break
    }

    // Nem etkisi
    if (weather.humidity > 80) {
      energyModifier -= 0.1
      description += "Yüksek nem sakinleştirici etki yapıyor. "
    }

    // Rüzgar etkisi
    if (weather.windSpeed > 20) {
      energyModifier += 0.1
      description += "Rüzgarlı hava dinamik müzikler öneriyor. "
    }

    return {
      energyModifier: Math.max(-0.5, Math.min(0.5, energyModifier)),
      valenceModifier: Math.max(-0.5, Math.min(0.5, valenceModifier)),
      description: description.trim()
    }
  }

  // Konum alma (Geolocation API)
  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation desteklenmiyor'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
          reject(new Error('Konum alınamadı'))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 dakika cache
        }
      )
    })
  }

  // Zaman dilimi ve saat etkisi hesapla
  static calculateTimeEffect(): {
    energyModifier: number
    valenceModifier: number
    timeOfDay: string
    description: string
  } {
    const now = new Date()
    const hour = now.getHours()
    
    let energyModifier = 0
    let valenceModifier = 0
    let timeOfDay = ""
    let description = ""

    if (hour >= 6 && hour < 12) {
      timeOfDay = "morning"
      energyModifier = 0.2
      valenceModifier = 0.1
      description = "Sabah enerjisi için dinamik müzikler"
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = "afternoon"
      energyModifier = 0.1
      valenceModifier = 0.2
      description = "Öğleden sonra için pozitif müzikler"
    } else if (hour >= 17 && hour < 21) {
      timeOfDay = "evening"
      energyModifier = -0.1
      valenceModifier = 0.1
      description = "Akşam için rahatlatıcı müzikler"
    } else {
      timeOfDay = "night"
      energyModifier = -0.3
      valenceModifier = -0.1
      description = "Gece için sakin müzikler"
    }

    return {
      energyModifier,
      valenceModifier,
      timeOfDay,
      description
    }
  }

  // Mevsimsel etki hesapla
  static calculateSeasonEffect(): {
    energyModifier: number
    valenceModifier: number
    season: string
    description: string
  } {
    const now = new Date()
    const month = now.getMonth() + 1 // 1-12
    
    let energyModifier = 0
    let valenceModifier = 0
    let season = ""
    let description = ""

    if (month >= 3 && month <= 5) {
      season = "spring"
      energyModifier = 0.1
      valenceModifier = 0.2
      description = "İlkbahar enerjisi için neşeli müzikler"
    } else if (month >= 6 && month <= 8) {
      season = "summer"
      energyModifier = 0.3
      valenceModifier = 0.2
      description = "Yaz enerjisi için hareketli müzikler"
    } else if (month >= 9 && month <= 11) {
      season = "autumn"
      energyModifier = -0.1
      valenceModifier = -0.1
      description = "Sonbahar için melankolik müzikler"
    } else {
      season = "winter"
      energyModifier = -0.2
      valenceModifier = -0.1
      description = "Kış için sıcak ve sakin müzikler"
    }

    return {
      energyModifier,
      valenceModifier,
      season,
      description
    }
  }
}

// Export default instance
export const weatherAPI = new WeatherAPI()
