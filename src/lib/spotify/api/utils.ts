// src/lib/spotify/api/utils.ts - IMPROVED VERSION

import type { SpotifyTrack, AudioFeatures, AnalysisForAudioFeatures } from './types'

// IMPROVED: Gelişmiş Türkçe dil tespiti
export function isTurkish(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  
  const normalizedText = text.toLowerCase().trim()
  
  // 1. Turkish characters check (strong indicator)
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/
  if (turkishChars.test(normalizedText)) {
    console.log(`🔍 Turkish chars detected in: "${text.substring(0, 50)}..."`)
    return true
  }
  
  // 2. Common Turkish words (expanded list)
  const turkishWords = [
    // Pronouns & basic words
    'bir', 'bu', 've', 'ile', 'var', 'yok', 'ben', 'sen', 'o', 'biz', 'siz', 'onlar',
    'benim', 'senin', 'onun', 'bizim', 'sizin', 'onların',
    'şu', 'şey', 'ne', 'kim', 'hangi', 'kaç', 'nasıl', 'neden', 'niçin', 'nerede',
    
    // Verbs (most common)
    'olmak', 'etmek', 'yapmak', 'vermek', 'almak', 'gelmek', 'gitmek', 'kalmak',
    'durmak', 'başlamak', 'bitirmek', 'çalışmak', 'okumak', 'yazmak', 'dinlemek',
    'görmek', 'bakmak', 'gel', 'git', 'ol', 'et', 'yap', 'al', 'ver', 'kal', 'dur',
    
    // Emotional words (common in songs)
    'aşk', 'sevgi', 'kalp', 'gönül', 'hayat', 'yaşam', 'dünya', 'evren', 'zaman',
    'gün', 'gece', 'sabah', 'akşam', 'yıl', 'ay', 'hafta',
    'anne', 'baba', 'kardeş', 'arkadaş', 'sevgili', 'eş', 'aile',
    
    // Adjectives & adverbs
    'büyük', 'küçük', 'güzel', 'kötü', 'iyi', 'fena', 'yeni', 'eski', 'genç', 'yaşlı',
    'çok', 'az', 'daha', 'en', 'hiç', 'sadece', 'ancak', 'belki', 'mutlaka', 'kesinlikle',
    'tabii', 'elbette', 'hep', 'her',
    
    // Colors
    'siyah', 'beyaz', 'kırmızı', 'mavi', 'yeşil', 'sarı', 'pembe', 'mor', 'turuncu',
    'kahverengi', 'gri',
    
    // Prepositions & conjunctions
    'için', 'ile', 'gibi', 'kadar', 'değil', 'da', 'ta', 'ki', 'ama', 'fakat', 'veya',
    'ya', 'üzerinde', 'altında', 'yanında', 'karşısında', 'arkasında', 'önünde',
    'içinde', 'dışında', 'arasında', 'üstünde',
    
    // Directions & basic concepts
    'geri', 'ileri', 'yukarı', 'aşağı', 'sağ', 'sol', 'doğru', 'yanlış', 'evet', 'hayır',
    'tamam', 'peki', 'hadi',
    
    // Cities & places (common in Turkish music)
    'istanbul', 'ankara', 'izmir', 'antalya', 'bursa', 'adana', 'konya', 'gaziantep',
    'türkiye', 'türk', 'anadolu', 'kapadokya', 'boğaz', 'galata',
    
    // Music/Cultural terms
    'şarkı', 'müzik', 'ses', 'nota', 'melodi', 'ritim', 'beat', 'dans', 'oyun',
    'türkü', 'halk', 'klasik', 'pop', 'rock', 'elektronik'
  ]
  
  const turkishWordPattern = new RegExp('\\b(' + turkishWords.join('|') + ')\\b', 'gi')
  const turkishMatches = normalizedText.match(turkishWordPattern)
  
  if (turkishMatches && turkishMatches.length >= 1) {
    console.log(`🔍 Turkish words detected: ${turkishMatches.slice(0, 3).join(', ')} in "${text.substring(0, 50)}..."`)
    return true
  }
  
  // 3. Turkish artist name patterns
  const turkishNamePatterns = [
    // Common Turkish name patterns
    /\b(ahmet|mehmet|ali|hasan|hüseyin|mustafa|ibrahim|ismail|abdullah|mahmut)\b/gi,
    /\b(ayşe|fatma|emine|hatice|zeynep|özlem|sevgi|gül|nur|sultan)\b/gi,
    // Turkish surnames
    /\b(yılmaz|kaya|demir|şahin|çelik|yıldız|yıldırım|öztürk|aydin|özkan)\b/gi,
    // MC/DJ Turkish pattern
    /\b(mc|dj)\s+[çğıöşüa-z]+/gi,
    // Turkish music industry names
    /\b(tarkan|sezen|müslüm|barış|kenan|sertab|hadise|gülben|ebru|ajda|bülent|neşet|zeki|orhan|cem|teoman|şebnem|nil|seda|bengü|hande|demet|burcu)\b/gi
  ]
  
  for (const pattern of turkishNamePatterns) {
    if (pattern.test(normalizedText)) {
      console.log(`🔍 Turkish name pattern detected in: "${text.substring(0, 50)}..."`)
      return true
    }
  }
  
  // 4. Turkish music market indicators
  const turkishMarketPatterns = [
    /\btr\b/gi, // Market code
    /turkey/gi,
    /türkiye/gi,
    /\bturk\b/gi,
    /avrupa\s+müzik/gi,
    /doğan\s+music/gi,
    /sony\s+music\s+turkey/gi,
    /universal\s+music\s+turkey/gi
  ]
  
  for (const pattern of turkishMarketPatterns) {
    if (pattern.test(normalizedText)) {
      console.log(`🔍 Turkish market indicator detected in: "${text.substring(0, 50)}..."`)
      return true
    }
  }
  
  return false
}

// IMPROVED: Duplicate track'leri daha akıllı şekilde kaldır
export function removeDuplicateTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seen = new Set<string>()
  const artistTrackMap = new Map<string, Set<string>>()
  const result: SpotifyTrack[] = []
  
  for (const track of tracks) {
    const trackId = track.id
    const artistName = track.artists[0]?.name?.toLowerCase() || 'unknown'
    const trackName = track.name.toLowerCase()
    
    // Skip if exact same track ID
    if (seen.has(trackId)) {
      continue
    }
    
    // Skip if same artist has very similar track name
    if (!artistTrackMap.has(artistName)) {
      artistTrackMap.set(artistName, new Set())
    }
    
    const artistTracks = artistTrackMap.get(artistName)!
    const similarTrack = Array.from(artistTracks).find(existingTrack => {
      return trackName.includes(existingTrack) || existingTrack.includes(trackName)
    })
    
    if (similarTrack) {
      console.log(`🔄 Skipping similar track: "${track.name}" (similar to existing track by ${artistName})`)
      continue
    }
    
    seen.add(trackId)
    artistTracks.add(trackName)
    result.push(track)
  }
  
  console.log(`✨ Duplicate removal: ${tracks.length} -> ${result.length} tracks`)
  return result
}

// IMPROVED: AI analizine göre audio features hesapla (daha hassas)
export function calculateAudioFeatures(analysis: AnalysisForAudioFeatures): AudioFeatures {
  let energy = 0.5
  let valence = 0.5
  let tempo = 120
  let acousticness = 0.5
  let instrumentalness = 0.1

  console.log('🎵 Calculating audio features from analysis:', {
    energyLevel: analysis.energyLevel,
    valence: analysis.valence,
    moodScore: analysis.moodScore
  })

  // Energy Level'a göre (daha hassas mapping)
  switch (analysis.energyLevel) {
    case 'low':
      energy = 0.25 // Daha düşük
      tempo = 80    // Daha yavaş
      acousticness = 0.75 // Daha akustik
      instrumentalness = 0.2 // Biraz daha enstrümantal
      break
    case 'medium':
      energy = 0.55 // Orta seviye
      tempo = 115   // Orta tempo
      acousticness = 0.45 // Dengeli
      instrumentalness = 0.1 // Az enstrümantal
      break
    case 'high':
      energy = 0.8  // Yüksek enerji
      tempo = 135   // Hızlı tempo
      acousticness = 0.2 // Daha az akustik
      instrumentalness = 0.05 // Çok az enstrümantal
      break
  }

  // Valence'a göre (daha hassas mapping)
  switch (analysis.valence) {
    case 'negative':
      valence = 0.25 // Daha düşük
      instrumentalness = Math.min(0.4, instrumentalness + 0.2) // Daha enstrümantal
      acousticness = Math.min(0.8, acousticness + 0.1) // Biraz daha akustik
      break
    case 'neutral':
      valence = 0.5 // Orta
      break
    case 'positive':
      valence = 0.75 // Daha yüksek
      energy = Math.min(0.9, energy + 0.1) // Biraz daha enerjik
      break
  }

  // Mood score'a göre fine tuning (daha detaylı)
  const moodScore = analysis.moodScore || 5
  
  if (moodScore <= 2) {
    // Çok negatif
    valence = Math.max(0.1, valence - 0.3)
    energy = Math.max(0.1, energy - 0.2)
    acousticness = Math.min(0.9, acousticness + 0.2)
    instrumentalness = Math.min(0.5, instrumentalness + 0.3)
  } else if (moodScore <= 4) {
    // Negatif
    valence = Math.max(0.1, valence - 0.15)
    energy = Math.max(0.2, energy - 0.1)
  } else if (moodScore >= 8) {
    // Çok pozitif
    valence = Math.min(0.9, valence + 0.15)
    energy = Math.min(0.9, energy + 0.1)
    acousticness = Math.max(0.1, acousticness - 0.1)
  } else if (moodScore >= 6) {
    // Pozitif
    valence = Math.min(0.8, valence + 0.1)
  }

  const result = { 
    energy: Math.round(energy * 100) / 100,
    valence: Math.round(valence * 100) / 100,
    tempo: Math.round(tempo),
    acousticness: Math.round(acousticness * 100) / 100,
    instrumentalness: Math.round(instrumentalness * 100) / 100
  }

  console.log('🎶 Calculated audio features:', result)
  return result
}

// YENI: Track quality scorer
export function scoreTrackQuality(track: SpotifyTrack): number {
  let score = 0
  
  // Popularity score (0-50 points)
  score += Math.min(50, track.popularity * 0.5)
  
  // Album image quality (indicates professional release)
  if (track.album.images && track.album.images.length > 0) {
    score += 10
    if (track.album.images[0].url.includes('640x640')) {
      score += 5 // High quality image
    }
  }
  
  // Preview availability
  if (track.preview_url) {
    score += 5
  }
  
  // Artist name quality (not empty, not just numbers)
  const artistName = track.artists[0]?.name || ''
  if (artistName.length > 2 && !/^\d+$/.test(artistName)) {
    score += 10
  }
  
  // Track name quality
  if (track.name.length > 2 && track.name.trim().length > 0) {
    score += 10
  }
  
  // Bonus for reasonable duration (not too short/long)
  const durationMinutes = track.duration_ms / (1000 * 60)
  if (durationMinutes >= 1.5 && durationMinutes <= 8) {
    score += 10
  }
  
  return Math.min(100, score)
}

// YENI: Smart shuffle with quality consideration
export function smartShuffle(tracks: SpotifyTrack[]): SpotifyTrack[] {
  // Calculate quality scores and sort
  return tracks
    .map(track => ({
      track,
      score: scoreTrackQuality(track)
    }))
    .sort((a, b) => {
      const scoreDiff = b.score - a.score
      
      // If quality is very similar, randomize
      if (Math.abs(scoreDiff) < 10) {
        return Math.random() - 0.5
      }
      
      return scoreDiff
    })
    .map(item => item.track)
}

// YENI: Text similarity checker
export function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (text: string) => text.toLowerCase().trim().replace(/[^\w\s]/g, '')
  
  const normalized1 = normalize(text1)
  const normalized2 = normalize(text2)
  
  if (normalized1 === normalized2) return 1.0
  
  const words1 = normalized1.split(/\s+/)
  const words2 = normalized2.split(/\s+/)
  
  const commonWords = words1.filter(word => words2.includes(word))
  const totalWords = Math.max(words1.length, words2.length)
  
  return totalWords > 0 ? commonWords.length / totalWords : 0
}