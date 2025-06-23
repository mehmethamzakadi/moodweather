// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Types - Supabase'den generate edilecek
export interface User {
  id: string
  email: string
  name?: string
  spotify_id?: string
  created_at: string
  updated_at: string
}

export interface MoodSession {
  id: string
  user_id: string
  current_mood: string
  target_mood: string
  mood_score: number
  location?: string
  ai_analysis: string // JSON string
  playlist_strategy: string
  session_date: string
  include_turkish: boolean
  is_playlist_private: boolean
  created_at: string
}

export interface PlaylistHistory {
  id: string
  user_id: string
  session_id: string
  playlist_name: string
  track_count: number
  total_duration: number // seconds
  average_energy: number
  average_valence: number
  average_tempo: number
  genres: string
  spotify_playlist_id: string
  generated_at: string
  play_count: number
}
