// src/lib/supabase.ts - Supabase Client Configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          image: string | null
          spotify_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          image?: string | null
          spotify_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          image?: string | null
          spotify_id?: string | null
          updated_at?: string
        }
      }
      mood_sessions: {
        Row: {
          id: string
          user_id: string
          current_mood: string
          target_mood: string | null
          mood_score: number | null
          location: string | null
          temperature: number | null
          weather_condition: string | null
          ai_analysis: string | null
          playlist_strategy: string | null
          session_date: string
          session_duration: number | null
          effectiveness_rating: number | null
          user_feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          current_mood: string
          target_mood?: string | null
          mood_score?: number | null
          location?: string | null
          temperature?: number | null
          weather_condition?: string | null
          ai_analysis?: string | null
          playlist_strategy?: string | null
          session_date?: string
          session_duration?: number | null
          effectiveness_rating?: number | null
          user_feedback?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          current_mood?: string
          target_mood?: string | null
          mood_score?: number | null
          location?: string | null
          temperature?: number | null
          weather_condition?: string | null
          ai_analysis?: string | null
          playlist_strategy?: string | null
          session_duration?: number | null
          effectiveness_rating?: number | null
          user_feedback?: string | null
          updated_at?: string
        }
      }
      playlist_history: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          playlist_name: string
          track_count: number
          total_duration: number | null
          average_energy: number | null
          average_valence: number | null
          average_tempo: number | null
          genres: string | null
          generated_at: string
          last_played_at: string | null
          play_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          playlist_name: string
          track_count?: number
          total_duration?: number | null
          average_energy?: number | null
          average_valence?: number | null
          average_tempo?: number | null
          genres?: string | null
          generated_at?: string
          last_played_at?: string | null
          play_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          playlist_name?: string
          track_count?: number
          total_duration?: number | null
          average_energy?: number | null
          average_valence?: number | null
          average_tempo?: number | null
          genres?: string | null
          last_played_at?: string | null
          play_count?: number
          updated_at?: string
        }
      }
    }
  }
}

// Helper functions
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
