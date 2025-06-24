// src/lib/spotify/api/filters.ts - IMPROVED VERSION

import type { SpotifyTrack, WeatherContext } from './types'
import { isTurkish } from './utils'

// Şarkı çeşitlilik ve filtreleme algoritması (HAVA DURUMU DESTEKLİ) - IMPROVED
export function filterAndDiversifyTracks(tracks: SpotifyTrack[], options: {
  maxPerArtist: number;
  minPopularity: number;
  targetCount: number;
  includeTurkish?: boolean;
  weatherPreference?: WeatherContext | null;
}): SpotifyTrack[] {
  const { maxPerArtist, minPopularity, targetCount, includeTurkish = false } = options
  
  console.log('🎆 IMPROVED: Hava durumu destekli çeşitlilik algoritması...', options)
  console.log(`📊 Başlangıç: ${tracks.length} şarkı`)
  
  // 1. Popülerlik filtresi - daha esnek
  let filteredTracks = tracks.filter(track => track.popularity >= Math.max(minPopularity - 15, 0))
  console.log(`📊 Esnek popülerlik filtresi (${Math.max(minPopularity - 15, 0)}+): ${tracks.length} -> ${filteredTracks.length}`)
  
  // 2. Türkçe filtresi - IMPROVED
  if (!includeTurkish) {
    const beforeCount = filteredTracks.length
    filteredTracks = filteredTracks.filter(track => {
      const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`
      const isTrackTurkish = isTurkish(trackText)
      
      if (isTrackTurkish) {
        console.log(`🚫 TÜRKÇE FİLTRE: "${track.name}" by ${track.artists[0]?.name} - filtered out`)
      }
      
      return !isTrackTurkish
    })
    console.log(`🌍 IMPROVED Türkçe filtre: ${beforeCount} -> ${filteredTracks.length} şarkı`)
  } else {
    console.log(`🇹🇷 Türkçe şarkılara izin veriliyor: ${filteredTracks.length} şarkı`)
  }
  
  // 3. Sanatçı çeşitliliği - IMPROVED with better distribution
  const artistCount = new Map<string, number>()
  const diversifiedTracks: SpotifyTrack[] = []
  
  // Sort by popularity but with some randomness for variety
  const sortedTracks = filteredTracks
    .sort((a, b) => {
      // Primary sort: popularity
      const popularityDiff = b.popularity - a.popularity
      if (Math.abs(popularityDiff) > 20) return popularityDiff
      
      // Secondary sort: add some randomness for tracks with similar popularity
      return Math.random() - 0.5
    })
  
  // First pass: ensure artist diversity
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
  
  // Second pass: if we still need more tracks, be more lenient
  if (diversifiedTracks.length < targetCount) {
    const remainingTracks = sortedTracks.filter(track => 
      !diversifiedTracks.some(dt => dt.id === track.id)
    )
    
    const needed = targetCount - diversifiedTracks.length
    const additionalTracks = remainingTracks.slice(0, needed)
    diversifiedTracks.push(...additionalTracks)
    
    console.log(`🔄 Ek şarkı eklendi: ${additionalTracks.length} (toplam: ${diversifiedTracks.length})`)
  }
  
  console.log(`🎨 IMPROVED Sanatçı çeşitliliği: ${diversifiedTracks.length} şarkı`)
  console.log(`📈 Başarı oranı: ${Math.round((diversifiedTracks.length / targetCount) * 100)}%`)
  
  // Log artist distribution
  const artistDistribution = new Map<string, number>()
  diversifiedTracks.forEach(track => {
    const artist = track.artists[0]?.name || 'Unknown'
    artistDistribution.set(artist, (artistDistribution.get(artist) || 0) + 1)
  })
  
  console.log('🎭 Sanatçı dağılımı:')
  Array.from(artistDistribution.entries())
    .slice(0, 5)
    .forEach(([artist, count]) => {
      console.log(`   • ${artist}: ${count} şarkı`)
    })
  
  return diversifiedTracks
}

// YENI: Advanced Turkish content detection
export function detectTurkishContent(track: SpotifyTrack): {
  isTurkish: boolean;
  confidence: number;
  reasons: string[];
} {
  const reasons: string[] = []
  let confidence = 0
  
  const trackText = `${track.name} ${track.artists[0]?.name} ${track.album.name}`.toLowerCase()
  
  // Turkish characters check
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/g
  const turkishCharMatches = trackText.match(turkishChars)
  if (turkishCharMatches) {
    confidence += turkishCharMatches.length * 15
    reasons.push(`Turkish characters: ${turkishCharMatches.join(', ')}`)
  }
  
  // Turkish words check
  const turkishWords = [
    'bir', 'bu', 've', 'ile', 'var', 'yok', 'ben', 'sen', 'o', 'biz', 'siz', 'onlar',
    'aşk', 'sevgi', 'kalp', 'gönül', 'hayat', 'yaşam', 'dünya', 'zaman', 'gece', 'gün',
    'sen', 'benim', 'senin', 'bizim', 'sana', 'bana', 'için', 'çok', 'daha', 'hiç',
    'gel', 'git', 'ol', 'et', 'yap', 'al', 'ver', 'kal', 'dur', 'içinde', 'gibi',
    'kadar', 'değil', 'ama', 'fakat', 'veya', 'ya', 'ki', 'de', 'da', 'ne', 'nasıl',
    'istanbul', 'ankara', 'izmir', 'türkiye', 'türk', 'anadolu'
  ]
  
  let wordMatches = 0
  turkishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = trackText.match(regex)
    if (matches) {
      wordMatches += matches.length
      if (matches.length === 1) {
        reasons.push(`Turkish word: "${word}"`)
      } else {
        reasons.push(`Turkish word: "${word}" (${matches.length}x)`)
      }
    }
  })
  
  confidence += wordMatches * 20
  
  // Turkish artist patterns
  const turkishArtistPatterns = [
    /\b(mc|dj)\s+\w+/i, // MC Serhat, DJ Akman gibi
    /\b\w+\s+(bey|hanım|ağa)\b/i, // Ahmet Bey, Ayşe Hanım gibi
    /\b(tarkan|sezen|müslüm|barış|kenan|sertab|hadise|gülben|ebru|ajda|bülent)\b/i // Famous Turkish names
  ]
  
  turkishArtistPatterns.forEach(pattern => {
    if (pattern.test(trackText)) {
      confidence += 30
      reasons.push('Turkish artist pattern detected')
    }
  })
  
  // Market/Label indicators
  const turkishMarketIndicators = [
    /\btr\b/i, // Market code
    /turkey/i,
    /türkiye/i,
    /avrupa\s+müzik/i,
    /doğan\s+music/i,
    /sony\s+music\s+turkey/i
  ]
  
  turkishMarketIndicators.forEach(pattern => {
    if (pattern.test(trackText)) {
      confidence += 25
      reasons.push('Turkish market indicator')
    }
  })
  
  const isTurkish = confidence >= 30 // Threshold for Turkish content
  
  return {
    isTurkish,
    confidence,
    reasons
  }
}

// YENI: Weather-aware filtering
export function applyWeatherFiltering(
  tracks: SpotifyTrack[], 
  weather: WeatherContext | null
): SpotifyTrack[] {
  if (!weather) return tracks
  
  console.log(`🌤️ Hava durumu filtresi uygulanıyor: ${weather.condition}`)
  
  // Weather-specific filtering logic
  const weatherKeywords = {
    'rainy': ['rain', 'storm', 'water', 'drops', 'wet'],
    'clear': ['sun', 'bright', 'shine', 'light', 'day'],
    'cloudy': ['cloud', 'grey', 'overcast', 'mist'],
    'clear-night': ['night', 'moon', 'star', 'midnight', 'dark']
  }
  
  const relevantKeywords = weatherKeywords[weather.condition as keyof typeof weatherKeywords] || []
  
  if (relevantKeywords.length === 0) return tracks
  
  // Calculate weather scores and sort by relevance + popularity
  return tracks
    .map(track => {
      const trackText = `${track.name} ${track.album.name}`.toLowerCase()
      let score = 0
      
      relevantKeywords.forEach(keyword => {
        if (trackText.includes(keyword)) {
          score += 10
        }
      })
      
      return {
        track,
        totalScore: score + (track.popularity * 0.5)
      }
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(item => item.track)
}