// src/app/api/debug/clear-sessions/route.ts
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST() {
  try {
    console.log('🗑️ Clearing mood sessions...')
    
    // Supabase'de mood session'ları temizle
    // JWT session'lar stateless olduğu için temizlemeye gerek yok
    
    const { data: deletedSessions, error } = await supabase
      .from('mood_sessions')
      .delete()
      .neq('id', '')  // Tüm kayıtları sil
      .select('id')
    
    if (error) {
      console.error('Clear mood sessions error:', error)
      return NextResponse.json(
        { 
          error: "Clear sessions failed",
          details: error.message
        },
        { status: 500 }
      )
    }

    const deletedCount = deletedSessions?.length || 0
    console.log(`✅ Cleared ${deletedCount} mood sessions`)

    return NextResponse.json({
      success: true,
      deletedMoodSessions: deletedCount,
      message: "Mood sessions cleared successfully",
      note: "JWT auth sessions are stateless and don't need clearing"
    })

  } catch (error) {
    console.error('💥 Clear sessions error:', error)
    return NextResponse.json(
      { 
        error: "Clear sessions failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
