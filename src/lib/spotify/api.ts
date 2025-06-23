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
interface MoodAnalysis {
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
    // Türkçe karakterler ve yaygın kelimeler
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

  // Spotify'dan available genres al
  async getAvailableGenres() {
    // Market parametresi olmadan dene
    return this.makeRequest('/recommendations/available-genre-seeds')
  }

  // Kullanıcı profilini al
  async getUserProfile() {
    return this.makeRequest('/me')
  }

  // Genre'lere göre şarkı ara
  async searchTracks(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { limit = 20 } = params
    
    // Yıl kısıtlaması olmadan arama - tüm zamanlar
    const query = `popular` // Sadece popüler şarkılar
    
    // URL encode
    const encodedQuery = encodeURIComponent(query)
    
    const endpoint = `/search?q=${encodedQuery}&type=track&limit=${limit}`
    
    console.log('🔍 Spotify search endpoint:', endpoint)
    console.log('🌍 Tüm zamanlardan arama yapılıyor')
    
    const response = await this.makeRequest(endpoint)
    return response.tracks.items as SpotifyTrack[]
  }

  // Genre temelli tutarlı şarkı arama - tür tutarlılığına odaklanır
  async searchTracksWithGenre(genres: string[]): Promise<SpotifyTrack[]> {
    // AI'dan gelen genre'lara göre çok daha spesifik arama terimleri belirle
    const genreQueries = this.generateGenreSpecificQueries(genres)
    
    const allTracks: SpotifyTrack[] = []
    
    for (const query of genreQueries.slice(0, 5)) { // 5 spesifik arama
      try {
        const encodedQuery = encodeURIComponent(query)
        const endpoint = `/search?q=${encodedQuery}&type=track&limit=12`
        
        console.log('🎵 Tür tutarlı arama:', query)
        
        const response = await this.makeRequest(endpoint)
        const tracks = response.tracks.items as SpotifyTrack[]
        
        // Tür tutarlılığı için popülerlik filtresi uygula
        const consistentTracks = tracks.filter(track => track.popularity > 40)
        allTracks.push(...consistentTracks)
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150))
      } catch (error) {
        console.log('⚠️ Genre search hatası:', query, error)
        continue
      }
    }
    
    console.log(`🎨 Tür tutarlı sonuç: ${allTracks.length} şarkı`)
    return allTracks
  }

  // Tür tutarlılığı için çok spesifik genre query'leri oluştur
  private generateGenreSpecificQueries(genres: string[]): string[] {
    const specificQueries: string[] = []
    
    for (const genre of genres) {
      const genreLower = genre.toLowerCase()
      
      // Her genre için çok spesifik terimleri belirle
      if (genreLower.includes('latin')) {
        specificQueries.push(
          'genre:"latin pop"', 'genre:"reggaeton"', 'genre:"latin"',
          'latin music genre:"pop"', 'spanish songs genre:"latin"'
        )
      } else if (genreLower.includes('funk')) {
        specificQueries.push(
          'genre:"funk"', 'genre:"soul"', 'genre:"disco"',
          'funky beats genre:"funk"', 'groove music genre:"soul"'
        )
      } else if (genreLower.includes('elektronik') || genreLower.includes('electronic')) {
        specificQueries.push(
          'genre:"electronic"', 'genre:"house"', 'genre:"techno"',
          'electronic dance music', 'edm genre:"electronic"', 'synthesizer music'
        )
      } else if (genreLower.includes('pop')) {
        specificQueries.push(
          'genre:"pop"', 'genre:"indie pop"', 'genre:"electropop"',
          'mainstream pop', 'catchy pop songs', 'radio friendly pop'
        )
      } else if (genreLower.includes('rock')) {
        specificQueries.push(
          'genre:"rock"', 'genre:"indie rock"', 'genre:"alternative rock"',
          'guitar music genre:"rock"', 'band music rock'
        )
      } else if (genreLower.includes('folk') || genreLower.includes('acoustic')) {
        specificQueries.push(
          'genre:"folk"', 'genre:"acoustic"', 'genre:"indie folk"',
          'acoustic guitar music', 'singer songwriter folk', 'organic instruments'
        )
      } else if (genreLower.includes('ambient') || genreLower.includes('chill')) {
        specificQueries.push(
          'genre:"ambient"', 'genre:"chillout"', 'genre:"downtempo"',
          'relaxing music ambient', 'atmospheric sounds', 'meditative music'
        )
      } else if (genreLower.includes('jazz')) {
        specificQueries.push(
          'genre:"jazz"', 'genre:"smooth jazz"', 'genre:"contemporary jazz"',
          'jazz instruments', 'saxophone music', 'piano jazz'
        )
      } else if (genreLower.includes('classical')) {
        specificQueries.push(
          'genre:"classical"', 'genre:"neoclassical"', 'genre:"modern classical"',
          'orchestral music', 'piano classical', 'string instruments'
        )
      } else if (genreLower.includes('hip-hop') || genreLower.includes('rap')) {
        specificQueries.push(
          'genre:"hip hop"', 'genre:"rap"', 'genre:"hip-hop"',
          'rap music beats', 'urban music hip hop'
        )
      } else if (genreLower.includes('r-n-b') || genreLower.includes('rnb')) {
        specificQueries.push(
          'genre:"r&b"', 'genre:"soul"', 'genre:"neo soul"',
          'rhythm and blues', 'smooth r&b vocals'
        )
      } else {
        // Bilinmeyen genre için daha genel ama tutarlı aramalar
        specificQueries.push(
          `"${genre}" music`, `${genre} songs`, `${genre} style music`
        )
      }
    }
    
    // Tekrarları kaldır ve karıştır
    const uniqueQueries = [...new Set(specificQueries)]
    return this.shuffleArray(uniqueQueries)
  }
  
  // Array karıştırma fonksiyonu - çeşitlilik için
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Audio features'lara göre track önerileri al
  async getRecommendations(params: SpotifySearchParams): Promise<SpotifyTrack[]> {
    const { genres, energy, valence, tempo, limit = 20 } = params
    
    // Güvenli genre listesi - Spotify'ın desteklediği bilinen genre'lar
    const safeGenres = ['pop', 'dance', 'electronic', 'indie', 'chill', 'acoustic', 'rock', 'jazz']
    
    // Genre'ları Spotify formatına çevir
    const spotifyGenres = this.mapGenresToSpotify(genres)
    
    // Eğer genre bulunamazsa veya güvenli değilse, default genre'lar kullan
    const validGenres = spotifyGenres.filter(g => safeGenres.includes(g))
    const finalGenres = validGenres.length > 0 ? validGenres.slice(0, 3) : ['pop', 'dance', 'electronic']
    
    console.log('🎵 Original genres:', genres)
    console.log('🎵 Mapped genres:', spotifyGenres)
    console.log('🎵 Safe genres:', finalGenres)
    
    // Recommendations endpoint kullan (daha iyi sonuçlar verir)
    const seedGenres = finalGenres.join(',')
    
    let endpoint = `/recommendations?seed_genres=${encodeURIComponent(seedGenres)}&limit=${limit}`
    
    // Market parametresini kaldır - 404 hatasına sebep olabilir
    // Market yerine sadece temel parametreleri kullan
    
    // Audio features ekle
    if (energy !== undefined) endpoint += `&target_energy=${energy}`
    if (valence !== undefined) endpoint += `&target_valence=${valence}`  
    if (tempo !== undefined) endpoint += `&target_tempo=${tempo}`
    
    console.log('🎵 Spotify recommendations endpoint:', endpoint)
    
    const response = await this.makeRequest(endpoint)
    return response.tracks as SpotifyTrack[]
  }

  // Playlist oluştur - Kullanıcı tercihi ile gizlilik
  async createPlaylist(userId: string, name: string, description: string, isPrivate: boolean = true): Promise<SpotifyPlaylist> {
    const endpoint = `/users/${userId}/playlists`
    
    const body = {
      name,
      description,
      public: !isPrivate, // isPrivate true ise public false olur
      collaborative: false // Sadece owner edit edebilir
    }

    console.log(`🔄 ${isPrivate ? 'Private' : 'Public'} playlist oluşturuluyor:`, name)
    console.log('📝 Request body:', JSON.stringify(body, null, 2))
    console.log('🎯 Endpoint:', endpoint)

    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    
    // Response'u kontrol et
    console.log('✅ Playlist oluşturuldu!')
    console.log('🔐 Public durumu:', response.public ? 'PUBLIC' : 'PRIVATE')
    console.log('🆔 Playlist ID:', response.id)
    console.log('🔗 Spotify URL:', response.external_urls?.spotify)
    
    // Sadece isPrivate true iken kontrol et
    if (isPrivate && response.public) {
      console.log('⚠️ Private olması beklenen playlist public oluştu, düzeltiliyor...')
      try {
        await this.updatePlaylistPrivacy(response.id, false)
        console.log('✅ Playlist private yapıldı')
        response.public = false // Response'u güncelle
      } catch (privacyError) {
        console.error('❌ Playlist private yapılamadı:', privacyError)
        // Hata olsa da devam et, playlist oluştu
      }
    }
    
    return response
  }
  
  // Playlist gizlilik ayarını güncelle
  async updatePlaylistPrivacy(playlistId: string, isPublic: boolean): Promise<void> {
    const endpoint = `/playlists/${playlistId}`
    
    const body = {
      public: isPublic
    }
    
    console.log(`🔄 Playlist privacy güncelleniyor: ${playlistId} -> ${isPublic ? 'PUBLIC' : 'PRIVATE'}`)
    
    await this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
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

  // Gelişmiş şarkı arama - çeşitli stratejiler ile
  async searchTracksAdvanced(params: SpotifySearchParams & { 
    audioFeatures?: { energy: number; valence: number; tempo: number };
    includeTurkish?: boolean;
  }): Promise<SpotifyTrack[]> {
    const { genres, audioFeatures, includeTurkish = false, limit = 50 } = params
    
    console.log('🔍 Gelişmiş arama başlatılıyor...', { genres, includeTurkish })
    
    const allTracks: SpotifyTrack[] = []
    
    // Strateji 1: Genre bazlı arama
    for (const genre of genres.slice(0, 3)) {
      try {
        const genreTracks = await this.searchTracksWithGenre([genre])
        allTracks.push(...genreTracks)
        console.log(`🎵 Genre "${genre}": ${genreTracks.length} şarkı`)
        
        await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting
      } catch (error) {
        console.log(`⚠️ Genre arama hatası: ${genre}`, error)
      }
    }
    
    // Strateji 2: Audio features bazlı arama
    if (audioFeatures) {
      try {
        const moodBasedTracks = await this.searchByMoodKeywords(audioFeatures)
        allTracks.push(...moodBasedTracks)
        console.log(`🎧 Mood arama: ${moodBasedTracks.length} şarkı`)
      } catch (error) {
        console.log('⚠️ Mood arama hatası:', error)
      }
    }
    
    // Strateji 3: Popüler şarkılar (fallback)
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
  
  // Mood keywords ile tür tutarlı arama
  private async searchByMoodKeywords(audioFeatures: { energy: number; valence: number; tempo: number }): Promise<SpotifyTrack[]> {
    const { energy, valence } = audioFeatures
    
    let moodKeywords: string[]
    
    if (energy > 0.7 && valence > 0.6) {
      // Mutlu ve enerjik - tutarlı dance/pop türleri
      moodKeywords = [
        'genre:"dance pop"', 'genre:"electropop"', 'upbeat genre:"pop"',
        'energetic dance music', 'feel good pop songs', 'party music genre:"dance"'
      ]
    } else if (energy < 0.4 && valence < 0.4) {
      // Üzgün ve sakin - tutarlı melancholic türleri
      moodKeywords = [
        'genre:"indie folk"', 'genre:"sad"', 'melancholic genre:"alternative"',
        'emotional ballads', 'heartbreak songs', 'slow genre:"indie"'
      ]
    } else if (energy < 0.4 && valence > 0.5) {
      // Sakin ve huzurlu - tutarlı chill türleri
      moodKeywords = [
        'genre:"chillout"', 'genre:"ambient"', 'relaxing genre:"acoustic"',
        'peaceful music', 'calm instrumental', 'meditation genre:"ambient"'
      ]
    } else if (energy > 0.6 && valence < 0.5) {
      // Enerjik ama olumsuz - tutarlı rock/alternative türleri
      moodKeywords = [
        'genre:"alternative rock"', 'genre:"indie rock"', 'intense genre:"rock"',
        'powerful guitar music', 'dramatic rock songs', 'alt rock genre:"alternative"'
      ]
    } else {
      // Nötr - popüler ama tutarlı türler
      moodKeywords = [
        'genre:"indie pop"', 'genre:"alternative"', 'mainstream genre:"pop"',
        'radio friendly indie', 'popular alternative music', 'chart hits genre:"pop"'
      ]
    }
    
    const tracks: SpotifyTrack[] = []
    
    for (const keyword of moodKeywords.slice(0, 4)) { // 4 tür tutarlı arama
      try {
        const encodedKeyword = encodeURIComponent(keyword)
        const endpoint = `/search?q=${encodedKeyword}&type=track&limit=10`
        
        const response = await this.makeRequest(endpoint)
        const keywordTracks = response.tracks.items as SpotifyTrack[]
        
        // Sadece yüksek popülerlikli şarkıları al (tür tutarlılığı için)
        const consistentTracks = keywordTracks.filter(track => track.popularity > 45)
        tracks.push(...consistentTracks)
        
        console.log(`🎯 Tür tutarlı mood: "${keyword}" -> ${consistentTracks.length} şarkı`)
        
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

  // Alternative recommendations - seed_artists kullanımı
  async getRecommendationsWithArtists(params: SpotifySearchParams & { seedArtists?: string[] }): Promise<SpotifyTrack[]> {
    const { energy, valence, tempo, limit = 20, seedArtists = [] } = params
    
    // Popüler sanatçı ID'leri (fallback için)
    const popularArtists = [
      '4dpARuHxo51G3z768sgnrY', // Adele
      '1uNFoZAHBGtllmzznpCI3s', // Justin Bieber  
      '06HL4z0CvFAxyc27GXpf02', // Taylor Swift
      '3TVXtAsR1Inumwj472S9r4', // Drake
      '1dfeR4HaWDbWqFHLkxsg1d'  // Queen
    ]
    
    const artists = seedArtists.length > 0 ? seedArtists.slice(0, 5) : popularArtists.slice(0, 3)
    
    let endpoint = `/recommendations?seed_artists=${artists.join(',')}&limit=${limit}`
    
    // Audio features ekle
    if (energy !== undefined) endpoint += `&target_energy=${energy}`
    if (valence !== undefined) endpoint += `&target_valence=${valence}`  
    if (tempo !== undefined) endpoint += `&target_tempo=${tempo}`
    
    console.log('🎤 Spotify recommendations with artists endpoint:', endpoint)
    
    const response = await this.makeRequest(endpoint)
    return response.tracks as SpotifyTrack[]
  }

  // Genre mapping - AI genre'larını Spotify genre'larına çevir
  private mapGenresToSpotify(genres: string[]): string[] {
    const genreMap: { [key: string]: string[] } = {
      // Temel genre'lar (büyük/küçük harf duyarlı)
      'pop': ['pop'],
      'latin': ['latin'],
      'funk': ['funk'],
      'rock': ['rock'],
      'jazz': ['jazz'],
      'classical': ['classical'],
      'electronic': ['electronic'],
      'folk': ['folk'],
      'ambient': ['ambient'],
      'indie': ['indie'],
      'chill': ['chill'],
      'acoustic': ['acoustic'],
      'dance': ['dance'],
      'r-n-b': ['r-n-b'],
      'hip-hop': ['hip-hop'],
      'country': ['country'],
      'blues': ['blues'],
      'reggae': ['reggae'],
      'soul': ['soul'],
      
      // Türkçe genre'lar
      'sakinleştirici-müzik': ['ambient', 'chill', 'new-age'],
      'hareketli-elektronik': ['electronic', 'dance', 'house'],
      'sakinleştirici-ortam': ['ambient', 'chill', 'new-age'],
      'iyileştirici-folk': ['folk', 'acoustic', 'indie-folk'],
      'duygusal-ortam': ['ambient', 'indie', 'alternative'],
      
      // Elektronik
      'upbeat-electronic': ['electronic', 'dance', 'house'],
      'ambient-electronic': ['ambient', 'electronic', 'chill'],
      'meditative-electronic': ['ambient', 'new-age', 'electronic'],
      
      // Pop ve Dance
      'modern-pop': ['pop', 'indie-pop'],
      'funk-fusion': ['funk', 'soul', 'jazz'],
      'upbeat-pop': ['pop', 'dance-pop'],
      
      // Sakin ve Rahatlatıcı
      'ambient-chill': ['ambient', 'chill', 'downtempo'],
      'acoustic-folk': ['acoustic', 'folk', 'indie-folk'],
      'meditative-folk': ['folk', 'new-age', 'ambient'],
      
      // Melankolik ve İyileştirici
      'melancholic-indie': ['indie', 'indie-rock', 'alternative'],
      'healing-folk': ['folk', 'acoustic', 'singer-songwriter'],
      'cathartic-ambient': ['ambient', 'post-rock', 'experimental'],
      
      // Klasik ve Minimalist
      'neo-classical': ['classical', 'modern-classical', 'piano'],
      'minimalist-piano': ['piano', 'classical', 'instrumental'],
      'restorative-ambient': ['ambient', 'new-age', 'meditation'],
      
      // Doğa ve Meditasyon
      'nature-fusion': ['ambient', 'new-age', 'world'],
      'yenileyici-ortam': ['ambient', 'chill', 'meditation'],
      'doğa-karışımı': ['ambient', 'world', 'new-age']
    }

    const mappedGenres: string[] = []
    
    for (const genre of genres) {
      const genreKey = genre.toLowerCase() // Küçük harfe çevir
      const mapped = genreMap[genreKey]
      if (mapped) {
        mappedGenres.push(...mapped)
      } else {
        // Eğer mapping bulamazsa, genre'ı küçük harf olarak kullan
        mappedGenres.push(genreKey)
      }
    }

    // Duplicate'ları kaldır ve ilk 5'ini al (Spotify limiti)
    return [...new Set(mappedGenres)].slice(0, 5)
  }

  // Şarkı çeşitlilik ve filtreleme algoritması
  static filterAndDiversifyTracks(tracks: SpotifyTrack[], options: {
    maxPerArtist: number;
    minPopularity: number;
    targetCount: number;
    includeTurkish?: boolean;
  }): SpotifyTrack[] {
    const { maxPerArtist, minPopularity, targetCount, includeTurkish = false } = options
    
    console.log('🎆 Çeşitlilik algoritması başlatılıyor...', options)
    
    // 1. Popülerlik filtresi
    let filteredTracks = tracks.filter(track => track.popularity >= minPopularity)
    console.log(`📊 Popülerlik filtresi: ${tracks.length} -> ${filteredTracks.length}`)
    
    // 2. Türkçe filtresi (eğer gerekirse)
    if (!includeTurkish) {
      const beforeCount = filteredTracks.length
      filteredTracks = filteredTracks.filter(track => {
        const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`
        return !SpotifyAPI.isTurkish(trackText)
      })
      console.log(`🌍 Türkçe filtre: ${beforeCount} -> ${filteredTracks.length}`)
    }
    
    // 3. Sanatçı çeşitliliği algoritması
    const artistCount = new Map<string, number>()
    const diversifiedTracks: SpotifyTrack[] = []
    
    // Önce popülerliğe göre sırala
    const sortedTracks = filteredTracks.sort((a, b) => b.popularity - a.popularity)
    
    for (const track of sortedTracks) {
      const artistName = track.artists[0]?.name
      if (!artistName) continue
      
      const currentCount = artistCount.get(artistName) || 0
      
      if (currentCount < maxPerArtist) {
        diversifiedTracks.push(track)
        artistCount.set(artistName, currentCount + 1)
        
        // Hedef sayıya ulaştıysak dur
        if (diversifiedTracks.length >= targetCount) {
          break
        }
      }
    }
    
    console.log(`🎨 Sanatçı çeşitliliği: ${diversifiedTracks.length} şarkı`)
    console.log(`🎤 Sanatçı dağılımı:`, Array.from(artistCount.entries()).slice(0, 10))
    
    // 4. Eğer yeterli şarkı yoksa, daha esnek kriterlerle tekrar dene
    if (diversifiedTracks.length < Math.min(targetCount, 10)) {
      console.log('⚠️ Yeterli şarkı yok, esnek kriterler uygulanıyor...')
      
      // Popülerlik kriterini düşür
      const relaxedTracks = tracks.filter(track => track.popularity >= Math.max(10, minPopularity - 15))
      
      // Daha fazla sanatçı şarkısına izin ver
      const relaxedArtistCount = new Map<string, number>()
      
      for (const track of relaxedTracks.sort((a, b) => b.popularity - a.popularity)) {
        const artistName = track.artists[0]?.name
        if (!artistName) continue
        
        const currentCount = relaxedArtistCount.get(artistName) || 0
        
        if (currentCount < maxPerArtist + 1) { // +1 esneklik
          // Zaten eklenmemişse ekle
          if (!diversifiedTracks.find(t => t.id === track.id)) {
            diversifiedTracks.push(track)
            relaxedArtistCount.set(artistName, currentCount + 1)
          }
          
          if (diversifiedTracks.length >= targetCount) {
            break
          }
        }
      }
      
      console.log(`🔄 Esnek kriterler: ${diversifiedTracks.length} şarkı`)
    }
    
    // 5. Karıştır (shuffle) - aynı sanatçıların ard arda gelmemesi için
    const shuffledTracks = SpotifyAPI.smartShuffle(diversifiedTracks)
    
    return shuffledTracks
  }
  
  // Akllı karıştırma - aynı sanatçıları dağıtır
  private static smartShuffle(tracks: SpotifyTrack[]): SpotifyTrack[] {
    if (tracks.length <= 2) return tracks
    
    const shuffled: SpotifyTrack[] = []
    const remaining = [...tracks]
    
    // İlk şarkıyı rastgele seç
    const firstIndex = Math.floor(Math.random() * remaining.length)
    shuffled.push(remaining.splice(firstIndex, 1)[0])
    
    // Kalan şarkılar için, önceki sanatçıdan farklı olanları tercih et
    while (remaining.length > 0) {
      const lastArtist = shuffled[shuffled.length - 1]?.artists[0]?.name
      
      // Farklı sanatçılardan olanları bul
      const differentArtists = remaining.filter(track => 
        track.artists[0]?.name !== lastArtist
      )
      
      if (differentArtists.length > 0) {
        // Farklı sanatçılardan rastgele seç
        const randomIndex = Math.floor(Math.random() * differentArtists.length)
        const selectedTrack = differentArtists[randomIndex]
        
        // Remaining array'den kaldır
        const indexInRemaining = remaining.findIndex(t => t.id === selectedTrack.id)
        shuffled.push(remaining.splice(indexInRemaining, 1)[0])
      } else {
        // Farklı sanatçı kalmamışsa rastgele seç
        const randomIndex = Math.floor(Math.random() * remaining.length)
        shuffled.push(remaining.splice(randomIndex, 1)[0])
      }
    }
    
    return shuffled
  }

  // AI analizine göre audio features hesapla
  static calculateAudioFeatures(analysis: MoodAnalysis) {
    let energy = 0.5 // default
    let valence = 0.5 // default
    let tempo = 120 // default BPM

    // Energy Level'a göre
    switch (analysis.energyLevel) {
      case 'low':
        energy = 0.3
        tempo = 90
        break
      case 'medium':
        energy = 0.6
        tempo = 120
        break
      case 'high':
        energy = 0.8
        tempo = 140
        break
    }

    // Valence'a göre
    switch (analysis.valence) {
      case 'negative':
        valence = 0.3
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

    return { energy, valence, tempo }
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
export type { SpotifyTrack, SpotifyPlaylist, SpotifySearchParams }
