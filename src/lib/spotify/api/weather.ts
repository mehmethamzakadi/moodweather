// src/lib/spotify/api/weather.ts

import type { WeatherContext } from './types'

// Hava durumu ile türleri genişletme
export function enhanceGenresWithWeather(baseGenres: string[], weather: WeatherContext): string[] {
  const enhanced = [...baseGenres]
  
  switch (weather.condition) {
    case "rainy":
      enhanced.push("jazz", "blues", "lo-fi", "indie", "melancholic", "acoustic")
      break
    case "clear":
      enhanced.push("pop", "dance", "electronic", "upbeat", "happy", "energetic")
      break
    case "clear-night":
      enhanced.push("ambient", "chillout", "downtempo", "atmospheric", "chill")
      break
    case "cloudy-night":
      enhanced.push("atmospheric", "ambient", "dark", "moody", "indie")
      break
    case "cloudy":
      enhanced.push("indie", "alternative", "mellow", "contemplative")
      break
    case "stormy":
      enhanced.push("alternative", "rock", "dramatic", "intense", "powerful")
      break
    case "snowy":
      enhanced.push("ambient", "peaceful", "serene", "acoustic", "chill")
      break
    case "foggy":
      enhanced.push("atmospheric", "ambient", "ethereal", "mysterious")
      break
  }
  
  // Sıcaklık etkisi
  if (weather.temperature > 25) {
    enhanced.push("upbeat", "energetic", "dance", "pop")
  } else if (weather.temperature < 10) {
    enhanced.push("acoustic", "ambient", "chill", "indie")
  }
  
  return [...new Set(enhanced)] // Tekrarları kaldır
}

// Hava durumu bazlı query'ler üret
export function generateWeatherQueries(weather: WeatherContext): string[] {
  let weatherQueries: string[] = []
  
  // Hava durumuna göre spesifik arama terimleri
  switch (weather.condition) {
    case "rainy":
      weatherQueries = [
        'rain songs', 'rainy day music', 'cozy rain',
        'melancholic rain', 'jazz rain', 'acoustic rain'
      ]
      break
    case "clear":
      weatherQueries = [
        'sunny day music', 'feel good sunshine', 'bright songs',
        'happy sunshine', 'summer vibes', 'upbeat sunny'
      ]
      break
    case "clear-night":
      weatherQueries = [
        'midnight music', 'night chill', 'peaceful night',
        'starry night', 'late night vibes', 'calm evening'
      ]
      break
    case "cloudy-night":
      weatherQueries = [
        'moody evening', 'atmospheric night', 'dark ambient',
        'contemplative night', 'introspective evening'
      ]
      break
    case "stormy":
      weatherQueries = [
        'storm music', 'dramatic weather', 'powerful songs',
        'intense storm', 'dramatic music', 'powerful energy'
      ]
      break
    case "snowy":
      weatherQueries = [
        'winter music', 'cozy snow', 'peaceful snow',
        'winter wonderland', 'snowy evening', 'winter chill'
      ]
      break
    default:
      weatherQueries = [
        'ambient music', 'atmospheric songs', 'nature music'
      ]
  }
  
  return weatherQueries
}
