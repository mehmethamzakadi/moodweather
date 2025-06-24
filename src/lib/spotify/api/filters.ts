// src/lib/spotify/api/filters.ts

import type { SpotifyTrack, WeatherContext } from './types'
import { isTurkish } from './utils'

// Şarkı çeşitlilik ve filtreleme algoritması (HAVA DURUMU DESTEKLİ)
export function filterAndDiversifyTracks(tracks: SpotifyTrack[], options: {
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
      return !isTurkish(trackText)
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
