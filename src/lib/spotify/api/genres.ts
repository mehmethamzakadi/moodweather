// src/lib/spotify/api/genres.ts

import type { AudioFeatures } from './types'

// Tür tutarlılığı için spesifik genre query'leri oluştur
export function generateGenreSpecificQueries(genres: string[]): string[] {
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

// Mood keywords üret
export function generateMoodKeywords(audioFeatures: AudioFeatures): string[] {
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
  
  return moodKeywords
}
