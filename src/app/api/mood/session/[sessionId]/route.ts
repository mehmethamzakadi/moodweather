// src/app/api/mood/session/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Session kontrol et
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Params'ı await et
    const resolvedParams = await params
    const { sessionId } = resolvedParams

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID gerekli" },
        { status: 400 }
      )
    }

    console.log('🔍 Session aranıyor:', sessionId)

    // Mood session'ı Supabase'den al
    const { data: moodSession, error: sessionError } = await supabase
      .from('mood_sessions')
      .select(`
        id,
        current_mood,
        target_mood,
        mood_score,
        ai_analysis,
        playlist_strategy,
        session_date,
        location,
        include_turkish,
        is_playlist_private
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('Session bulunamadı:', sessionError)
      
      // Eğer kolon yoksa (eski veritabanı), kolon olmadan tekrar dene
      if (sessionError.code === '42703') { // column does not exist
        console.log('⚠️ Eski DB şeması tespit edildi, kolon olmadan deneniyor...')
        
        const { data: fallbackSession, error: fallbackError } = await supabase
          .from('mood_sessions')
          .select(`
            id,
            current_mood,
            target_mood,
            mood_score,
            ai_analysis,
            playlist_strategy,
            session_date,
            location
          `)
          .eq('id', sessionId)
          .single()
          
        if (fallbackError || !fallbackSession) {
          return NextResponse.json(
            { error: "Session bulunamadı" },
            { status: 404 }
          )
        }
        
        // Fallback session response (eski kolon değerleri)
        const fallbackResponseData = {
          session: {
            id: fallbackSession.id,
            currentMood: fallbackSession.current_mood,
            targetMood: fallbackSession.target_mood,
            moodScore: fallbackSession.mood_score,
            aiAnalysis: fallbackSession.ai_analysis,
            playlistStrategy: fallbackSession.playlist_strategy,
            sessionDate: fallbackSession.session_date,
            location: fallbackSession.location,
            includeTurkish: false, // varsayılan değer
            isPlaylistPrivate: true // varsayılan değer
          }
        }
        
        return NextResponse.json(fallbackResponseData)
      }
      
      return NextResponse.json(
        { error: "Session bulunamadı" },
        { status: 404 }
      )
    }

    if (!moodSession) {
      return NextResponse.json(
        { error: "Session bulunamadı" },
        { status: 404 }
      )
    }

    console.log('✅ Session bulundu:', moodSession.id)

    // Response'u frontend'in beklediği formatta düzenle
    const responseData = {
      session: {
        id: moodSession.id,
        currentMood: moodSession.current_mood,
        targetMood: moodSession.target_mood,
        moodScore: moodSession.mood_score,
        aiAnalysis: moodSession.ai_analysis,
        playlistStrategy: moodSession.playlist_strategy,
        sessionDate: moodSession.session_date,
        location: moodSession.location,
        includeTurkish: moodSession.include_turkish || false,
        isPlaylistPrivate: moodSession.is_playlist_private !== false // varsayılan true
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💥 Session API hatası:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    return NextResponse.json(
      { 
        error: "Session bilgisi alınamadı",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
