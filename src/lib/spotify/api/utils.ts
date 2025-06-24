// src/lib/spotify/api/utils.ts

import type { SpotifyTrack, AudioFeatures, AnalysisForAudioFeatures } from './types'

// Türkçe dil tespiti için yardımcı fonksiyon
export function isTurkish(text: string): boolean {
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/
  const turkishWords = /\b(bir|bu|ve|ile|var|yok|ben|sen|o|biz|siz|onlar|değil|da|ta|ki|gibi|kadar|daha|en|çok|az|büyük|küçük|güzel|kötü|iyi|fena|yeni|eski|genç|yaşlı|siyah|beyaz|kırmızı|mavi|yeşil|sarı|pembe|mor|turuncu|kahverengi|gri|aşk|sevgi|kalp|gönül|hayat|yaşam|dünya|evren|zaman|gün|gece|sabah|akşam|öğle|yıl|ay|hafta|saat|dakika|saniye|anne|baba|kardeş|arkadaş|sevgili|eş|aile|ev|iş|çalışmak|okul|okumak|yazmak|dinlemek|görmek|bakmak|gelmek|gitmek|olmak|etmek|yapmak|vermek|almak|bulunmak|kalmak|durmak|başlamak|bitirmek|devam|hep|her|hiç|sadece|ancak|belki|mutlaka|kesinlikle|tabii|elbette|nasıl|neden|niçin|nerede|ne|kim|hangi|kaç)\b/gi
  
  return turkishChars.test(text) || turkishWords.test(text)
}

// Duplicate track'leri kaldır
export function removeDuplicateTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
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

// AI analizine göre audio features hesapla
export function calculateAudioFeatures(analysis: AnalysisForAudioFeatures): AudioFeatures {
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
