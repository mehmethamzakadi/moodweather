// src/app/api/debug/clear-all/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST() {
  try {
    console.log('🗑️ Starting complete database cleanup...')
    
    // Supabase tablolarını temizle (foreign key sırasına dikkat et)
    
    // 1. playlist_history tablosunu temizle
    const { error: playlistError } = await supabase
      .from('playlist_history')
      .delete()
      .neq('id', '')  // Tüm kayıtları sil
    
    if (playlistError) {
      console.error('Playlist history delete error:', playlistError)
    } else {
      console.log('✅ Deleted all playlist history')
    }
    
    // 2. mood_sessions tablosunu temizle
    const { error: sessionsError } = await supabase
      .from('mood_sessions')
      .delete()
      .neq('id', '')  // Tüm kayıtları sil
    
    if (sessionsError) {
      console.error('Mood sessions delete error:', sessionsError)
    } else {
      console.log('✅ Deleted all mood sessions')
    }
    
    // 3. users tablosunu temizle
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', '')  // Tüm kayıtları sil
    
    if (usersError) {
      console.error('Users delete error:', usersError)
    } else {
      console.log('✅ Deleted all users')
    }

    console.log('🎉 Database cleanup completed!')

    return NextResponse.json({
      success: true,
      message: "Supabase database completely cleared",
      clearedTables: [
        "playlist_history", "mood_sessions", "users"
      ],
      note: "JWT sessions are stateless and don't need clearing"
    })

  } catch (error) {
    console.error('💥 Clear all error:', error)
    return NextResponse.json(
      { 
        error: "Clear all failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
