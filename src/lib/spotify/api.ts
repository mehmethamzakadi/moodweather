// src/lib/spotify/api.ts

// Spotify API base URL
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// Spotify track arama parametreleri
interface SpotifySearchParams {
  genres: string[]
  energy?: number // 0.0 - 1.0
  valence?: number // 0.0 - 1.0
  tempo?: number // BPM
  limit?: number
  market?: string
}

// Weather context interface
interface WeatherContext {
  condition: string
  temperature: number
  description: string
  humidity: number
  windSpeed: number
}

// Audio features interface
interface AudioFeatures {
  energy: number
  valence: number
  tempo: number
  acousticness?: number
  instrumentalness?: number
}

// Spotify track objesi
interface SpotifyTrack {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
  uri: string
  preview_url: string | null
  external_urls: { spotify: string }
  duration_ms: number
  popularity: number
}

// Spotify playlist objesi
interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  external_urls: { spotify: string }
  images: { url: string }[]
  tracks: { total: number }
}

// Analysis interface for audio features calculation
interface AnalysisForAudioFeatures {
  energyLevel?: 'low' | 'medium' | 'high'
  valence?: 'negative' | 'neutral' | 'positive'
  moodScore?: number
}

// Spotify API helper class
export class SpotifyAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  // Türkçe dil tespiti için yardımcı fonksiyon
  private static isTurkish(text: string): boolean {
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/
    const turkishWords = /\b(bir|bu|ve|ile|var|yok|ben|sen|o|biz|siz|onlar|değil|da|ta|ki|gibi|kadar|daha|en|çok|az|büyük|küçük|güzel|kötü|iyi|fena|yeni|eski|genç|yaşlı|siyah|beyaz|kırmızı|mavi|yeşil|sarı|pembe|mor|turuncu|kahverengi|gri|aşk|sevgi|kalp|gönül|hayat|yaşam|dünya|evren|zaman|gün|gece|sabah|akşam|öğle|yıl|ay|hafta|saat|dakika|saniye|anne|baba|kardeş|arkadaş|sevgili|eş|aile|ev|iş|çalışmak|okul|okumak|yazmak|dinlemek|görmek|bakmak|gelmek|gitmek|olmak|etmek|yapmak|vermek|almak|bulunmak|kalmak|durmak|başlamak|bitirmek|devam|hep|her|hiç|sadece|ancak|belki|mutlaka|kesinlikle|tabii|elbette|nasıl|neden|niçin|nerede|ne|kim|hangi|kaç)\b/gi
    
    return turkishChars.test(text) || turkishWords.test(text)
  }

  // API isteği yapmak için base method
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${SPOTIFY_API_BASE}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Spotify API Error:', response.status, error)
      throw new Error(`Spotify API Error: ${response.status}`)
    }

    return response.json()
  }

  // Kullanıcı profilini al
  async getUserProfile() {
    return this.makeRequest('/me')
  }

  // Genre'lere göre şarkı ara
  async searchTracks(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { limit = 20 } = params
    
    const query = `popular`
    const encodedQuery = encodeURIComponent(query)
    const endpoint = `/search?q=${encodedQuery}&type=track&limit=${limit}`
    
    const response = await this.makeRequest(endpoint)
    return response.tracks.items as SpotifyTrack[]
  }

  // Genre temelli tutarlı şarkı arama
  async searchTracksWithGenre(genres: string[]): Promise<SpotifyTrack[]> {
    const genreQueries = this.generateGenreSpecificQueries(genres)
    const allTracks: SpotifyTrack[] = []
    
    for (const query of genreQueries.slice(0, 5)) {
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=12`
        
        const response = await this.makeRequest(endpoint)
        const tracks = response.tracks.items as SpotifyTrack[]
        const consistentTracks = tracks.filter(track => track.popularity > 40)
        allTracks.push(...consistentTracks)
        
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch (error) {
        console.log('⚠️ Genre search hatası:', query, error)
        continue
      }
    }
    
    return allTracks
  }

  // Tür tutarlılığı için spesifik genre query'leri oluştur
  private generateGenreSpecificQueries(genres: string[]): string[] {
    const specificQueries: string[] = []
    
    for (const genre of genres) {
      const genreLower = genre.toLowerCase()
      
      if (genreLower.includes('latin')) {
        specificQueries.push('genre:"latin pop"', 'genre:"reggaeton"', 'genre:"latin"')
      } else if (genreLower.includes('funk')) {
        specificQueries.push('genre:"funk"', 'genre:"soul"', 'genre:"disco"')
      } else if (genreLower.includes('elektronik') || genreLower.includes('electronic')) {
        specificQueries.push('genre:"electronic"', 'genre:"house"', 'genre:"techno"')
      } else if (genreLower.includes('pop')) {
        specificQueries.push('genre:"pop"', 'genre:"indie pop"', 'genre:"electropop"')
      } else if (genreLower.includes('rock')) {
        specificQueries.push('genre:"rock"', 'genre:"indie rock"', 'genre:"alternative rock"')
      } else if (genreLower.includes('folk') || genreLower.includes('acoustic')) {
        specificQueries.push('genre:"folk"', 'genre:"acoustic"', 'genre:"indie folk"')
      } else if (genreLower.includes('ambient') || genreLower.includes('chill')) {
        specificQueries.push('genre:"ambient"', 'genre:"chillout"', 'genre:"downtempo"')
      } else if (genreLower.includes('jazz')) {
        specificQueries.push('genre:"jazz"', 'genre:"smooth jazz"', 'genre:"contemporary jazz"')
      } else {
        specificQueries.push(`"${genre}" music`, `${genre} songs`)
      }
    }
    
    return [...new Set(specificQueries)]
  }

  // Playlist oluştur
  async createPlaylist(userId: string, name: string, description: string, isPrivate: boolean = true): Promise<SpotifyPlaylist> {
    const endpoint = `/users/${userId}/playlists`
    
    const body = {
      name,
      description,
      public: !isPrivate,
      collaborative: false
    }

    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    
    return response
  }

  // Playlist'e şarkı ekle
  async addTracksToPlaylist(playlistId: string, trackUris: string[]) {
    const endpoint = `/playlists/${playlistId}/tracks`
    
    const body = {
      uris: trackUris
    }

    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // HAVA DURUMU DESTEKLİ gelişmiş şarkı arama
  async searchTracksAdvanced(params: SpotifySearchParams & { 
    audioFeatures?: AudioFeatures;
    includeTurkish?: boolean;
    weatherContext?: WeatherContext;
  }): Promise<SpotifyTrack[]> {
    const { genres, audioFeatures, includeTurkish = false, limit = 50, weatherContext } = params
    
    console.log('🔍 Hava durumu destekli gelişmiş arama...', { 
      genres, 
      includeTurkish, 
      hasWeather: !!weatherContext,
      weatherCondition: weatherContext?.condition 
    })
    
    const allTracks: SpotifyTrack[] = []
    
    // Hava durumu ile genişletilmiş genre'lar
    const enhancedGenres = weatherContext 
      ? this.enhanceGenresWithWeather(genres, weatherContext)
      : genres
    
    console.log('🌤️ Hava durumu genişletilmiş türler:', enhancedGenres)
    
    // Strateji 1: Hava durumu destekli genre aramalar
    for (const genre of enhancedGenres.slice(0, 4)) {
      try {
        const genreTracks = await this.searchTracksWithGenre([genre])
        allTracks.push(...genreTracks)
        console.log(`🎵 Hava destekli genre "${genre}": ${genreTracks.length} şarkı`)
        
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.log(`⚠️ Genre arama hatası: ${genre}`, error)
      }
    }
    
    // Strateji 2: Hava durumu bazlı özel aramalar
    if (weatherContext) {
      try {
        const weatherTracks = await this.searchByWeatherMood(weatherContext)
        allTracks.push(...weatherTracks)
        console.log(`🌤️ Hava durumu arama: ${weatherTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Hava durumu arama hatası:', error)
      }
    }
    
    // Strateji 3: Audio features bazlı arama
    if (audioFeatures) {
      try {
        const moodBasedTracks = await this.searchByMoodKeywords(audioFeatures)
        allTracks.push(...moodBasedTracks)
        console.log(`🎧 Mood arama: ${moodBasedTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Mood arama hatası:', error)
      }
    }
    
    // Strateji 4: Popüler şarkılar (fallback)
    if (allTracks.length < 30) {
      try {
        const popularTracks = await this.searchTracks({ genres: [], limit: 20 })
        allTracks.push(...popularTracks)
        console.log(`📊 Popüler şarkılar: ${popularTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Popüler arama hatası:', error)
      }
    }
    
    // Türkçe filtreleme
    let filteredTracks = allTracks
    if (!includeTurkish) {
      const beforeCount = filteredTracks.length
      filteredTracks = allTracks.filter(track => {
        const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`
        return !SpotifyAPI.isTurkish(trackText)
      })
      console.log(`🌍 Türkçe filtre: ${beforeCount} -> ${filteredTracks.length} şarkı`)
    }
    
    // Duplicate'ları kaldır
    const uniqueTracks = this.removeDuplicateTracks(filteredTracks)
    console.log(`✨ Benzersiz şarkılar: ${uniqueTracks.length}`)
    
    return uniqueTracks.slice(0, limit)
  }

  // Hava durumu ile türleri genişletme
  private enhanceGenresWithWeather(baseGenres: string[], weather: WeatherContext): string[] {
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

  // Hava durumu bazlı özel şarkı arama
  private async searchByWeatherMood(weather: WeatherContext): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = []
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
    
    // Her weather query için arama yap
    for (const query of weatherQueries.slice(0, 3)) {
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=8`
        
        const response = await this.makeRequest(endpoint)
        const weatherTracks = response.tracks.items as SpotifyTrack[]
        
        // Popülerlik filtresi
        const filteredTracks = weatherTracks.filter(track => track.popularity > 35)
        tracks.push(...filteredTracks)
        
        console.log(`🌤️ Hava sorgusu "${query}": ${filteredTracks.length} şarkı`)
        
        await new Promise(resolve => setTimeout(resolve, 250))
      } catch (error) {
        console.log(`⚠️ Hava durumu arama hatası: ${query}`, error)
      }
    }
    
    return tracks
  }

  // Mood keywords ile arama
  private async searchByMoodKeywords(audioFeatures: AudioFeatures): Promise<SpotifyTrack[]> {
    const { energy, valence } = audioFeatures
    
    let moodKeywords: string[]
    
    if (energy > 0.7 && valence > 0.6) {
      moodKeywords = [
        'genre:"dance pop"', 'genre:"electropop"', 'upbeat genre:"pop"',
        'energetic dance music', 'feel good pop songs'
      ]
    } else if (energy < 0.4 && valence < 0.4) {
      moodKeywords = [
        'genre:"indie folk"', 'genre:"sad"', 'melancholic genre:"alternative"',
        'emotional ballads', 'heartbreak songs'
      ]
    } else if (energy < 0.4 && valence > 0.5) {
      moodKeywords = [
        'genre:"chillout"', 'genre:"ambient"', 'relaxing genre:"acoustic"',
        'peaceful music', 'calm instrumental'
      ]
    } else {
      moodKeywords = [
        'genre:"indie pop"', 'genre:"alternative"', 'mainstream genre:"pop"'
      ]
    }
    
    const tracks: SpotifyTrack[] = []
    
    for (const keyword of moodKeywords.slice(0, 4)) {
      try {
        const encodedKeyword = encodeURIComponent(keyword)
        const endpoint = `/search?q=${encodedKeyword}&type=track&limit=10`
        
        const response = await this.makeRequest(endpoint)
        const keywordTracks = response.tracks.items as SpotifyTrack[]
        
        const consistentTracks = keywordTracks.filter(track => track.popularity > 45)
        tracks.push(...consistentTracks)
        
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.log(`⚠️ Mood keyword arama hatası: ${keyword}`, error)
      }
    }
    
    return tracks
  }

  // Duplicate track'leri kaldır
  private removeDuplicateTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
    const seen = new Set<string>()
    return tracks.filter(track => {
      const trackId = track.id
      if (seen.has(trackId)) {
        return false
      }
      seen.add(trackId)
      return true
    })
  }

  // Şarkı çeşitlilik ve filtreleme algoritması (HAVA DURUMU DESTEKLİ)
  static filterAndDiversifyTracks(tracks: SpotifyTrack[], options: {
    maxPerArtist: number;
    minPopularity: number;
    targetCount: number;
    includeTurkish?: boolean;
    weatherPreference?: WeatherContext | null;
  }): SpotifyTrack[] {
    const { maxPerArtist, minPopularity, targetCount, includeTurkish = false } = options
    
    console.log('🎆 Hava durumu destekli çeşitlilik algoritması...', options)
    
    // 1. Popülerlik filtresi
    let filteredTracks = tracks.filter(track => track.popularity >= minPopularity)
    console.log(`📊 Popülerlik filtresi: ${tracks.length} -> ${filteredTracks.length}`)
    
    // 2. Türkçe filtresi
    if (!includeTurkish) {
      const beforeCount = filteredTracks.length
      filteredTracks = filteredTracks.filter(track => {
        const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`
        return !SpotifyAPI.isTurkish(trackText)
      })
      console.log(`🌍 Türkçe filtre: ${beforeCount} -> ${filteredTracks.length}`)
    }
    
    // 3. Sanatçı çeşitliliği
    const artistCount = new Map<string, number>()
    const diversifiedTracks: SpotifyTrack[] = []
    
    const sortedTracks = filteredTracks.sort((a, b) => b.popularity - a.popularity)
    
    for (const track of sortedTracks) {
      const artistName = track.artists[0]?.name
      if (!artistName) continue
      
      const currentCount = artistCount.get(artistName) || 0
      
      if (currentCount < maxPerArtist) {
        diversifiedTracks.push(track)
        artistCount.set(artistName, currentCount + 1)
        
        if (diversifiedTracks.length >= targetCount) {
          break
        }
      }
    }
    
    console.log(`🎨 Sanatçı çeşitliliği: ${diversifiedTracks.length} şarkı`)
    
    return diversifiedTracks
  }

  // AI analizine göre audio features hesapla
  static calculateAudioFeatures(analysis: AnalysisForAudioFeatures): AudioFeatures {
    let energy = 0.5
    let valence = 0.5
    let tempo = 120
    let acousticness = 0.5
    let instrumentalness = 0.1

    // Energy Level'a göre
    switch (analysis.energyLevel) {
      case 'low':
        energy = 0.3
        tempo = 90
        acousticness = 0.7
        break
      case 'medium':
        energy = 0.6
        tempo = 120
        break
      case 'high':
        energy = 0.8
        tempo = 140
        acousticness = 0.3
        break
    }

    // Valence'a göre
    switch (analysis.valence) {
      case 'negative':
        valence = 0.3
        instrumentalness = 0.3
        break
      case 'neutral':
        valence = 0.5
        break
      case 'positive':
        valence = 0.7
        break
    }

    // Mood score'a göre fine tuning
    const moodScore = analysis.moodScore || 5
    if (moodScore <= 3) {
      valence = Math.max(0.1, valence - 0.2)
      energy = Math.max(0.2, energy - 0.1)
    } else if (moodScore >= 8) {
      valence = Math.min(0.9, valence + 0.1)
      energy = Math.min(0.9, energy + 0.1)
    }

    return { energy, valence, tempo, acousticness, instrumentalness }
  }
}

// Session'dan Spotify API client oluştur
export function createSpotifyClient(session: { accessToken: string }) {
  if (!session.accessToken) {
    throw new Error('Spotify access token bulunamadı')
  }
  
  return new SpotifyAPI(session.accessToken)
}

// Export types
export type { SpotifyTrack, SpotifyPlaylist, SpotifySearchParams, WeatherContext, AudioFeatures }
