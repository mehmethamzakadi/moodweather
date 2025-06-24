// src/lib/spotify/api/index.ts

// Re-export everything from the modular components
export * from './types'
export * from './utils'
export * from './weather'
export * from './genres'
export * from './filters'
export * from './client'

// Main client export
export { SpotifyAPI } from './client'

// Session'dan Spotify API client oluştur
export function createSpotifyClient(session: { accessToken: string }) {
  if (!session.accessToken) {
    throw new Error('Spotify access token bulunamadı')
  }
  
  return new SpotifyAPI(session.accessToken)
}
