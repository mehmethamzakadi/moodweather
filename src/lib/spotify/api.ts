// src/lib/spotify/api.ts
// Bu dosya modüler yapıya geçiş için koruma altında - tüm exports yeni yapıdan geliyor

// Tüm exports yeni modüler yapıdan geliyor
export * from './api/index'

// Backward compatibility için eski static method'u export et
export { filterAndDiversifyTracks as SpotifyAPIFilterAndDiversify } from './api/filters'
export { calculateAudioFeatures as SpotifyAPICalculateAudioFeatures } from './api/utils'

// Ana class ve factory fonksiyonu
export { SpotifyAPI, createSpotifyClient } from './api/index'
