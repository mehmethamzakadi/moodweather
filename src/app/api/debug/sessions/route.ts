// src/app/api/debug/sessions/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log('📊 Fetching debug session information...')
    
    // Supabase'den tüm kullanıcıları al
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('Users fetch error:', usersError)
    }
    
    // Supabase'den tüm mood session'ları al
    const { data: moodSessions, error: sessionsError } = await supabase
      .from('mood_sessions')
      .select(`
        *,
        users!inner(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)  // Son 50 session
    
    if (sessionsError) {
      console.error('Mood sessions fetch error:', sessionsError)
    }
    
    // Playlist geçmişini al
    const { data: playlists, error: playlistsError } = await supabase
      .from('playlist_history')
      .select(`
        *,
        users!inner(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20)  // Son 20 playlist
    
    if (playlistsError) {
      console.error('Playlists fetch error:', playlistsError)
    }

    // İstatistikler
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    const { count: sessionCount } = await supabase
      .from('mood_sessions')
      .select('*', { count: 'exact', head: true })
    
    const { count: playlistCount } = await supabase
      .from('playlist_history')
      .select('*', { count: 'exact', head: true })

    console.log('📈 Debug stats:', {
      users: userCount,
      sessions: sessionCount,
      playlists: playlistCount
    })

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        moodSessions: moodSessions || [],
        playlists: playlists || [],
      },
      statistics: {
        totalUsers: userCount || 0,
        totalMoodSessions: sessionCount || 0,
        totalPlaylists: playlistCount || 0
      },
      note: "JWT sessions are stateless - no database session tracking needed",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Debug sessions error:', error)
    return NextResponse.json(
      { 
        error: "Debug sessions fetch failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
