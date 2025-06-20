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
    // Session kontrol et - NextAuth v4
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Params'ı await et
    const resolvedParams = await params
    const sessionId = resolvedParams.sessionId

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID gerekli" },
        { status: 400 }
      )
    }

    // JWT session'dan user email'ini al ve user'ı bul
    const userEmail = session.user.email!
    
    // User'ı email ile bul
    const { data: user, error: userFindError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .single()

    if (userFindError || !user) {
      console.log('User bulunamadı:', userFindError)
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    // Supabase'den mood session al
    const { data: moodSession, error: fetchError } = await supabase
      .from('mood_sessions')
      .select(`
        *,
        users!inner(name, email)
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !moodSession) {
      console.log('Supabase session fetch error:', fetchError)
      return NextResponse.json(
        { error: "Session bulunamadı veya erişim yetkiniz yok" },
        { status: 404 }
      )
    }

    console.log('📋 Real Supabase session found:', {
      sessionId: moodSession.id,
      userEmail: user.email,
      moodScore: moodSession.mood_score
    })

    return NextResponse.json({
      success: true,
      session: {
        id: moodSession.id,
        currentMood: moodSession.current_mood,
        targetMood: moodSession.target_mood,
        moodScore: moodSession.mood_score,
        location: moodSession.location,
        temperature: moodSession.temperature,
        weatherCondition: moodSession.weather_condition,
        aiAnalysis: moodSession.ai_analysis,
        playlistStrategy: moodSession.playlist_strategy,
        sessionDate: moodSession.session_date,
        sessionDuration: moodSession.session_duration,
        effectivenessRating: moodSession.effectiveness_rating,
        userFeedback: moodSession.user_feedback,
        createdAt: moodSession.created_at,
        updatedAt: moodSession.updated_at,
        user: moodSession.users
      },
      message: "Real Supabase session data"
    })

  } catch (error) {
    console.error('🚨 Session fetch error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    return NextResponse.json(
      { 
        error: "Session yüklenirken hata oluştu",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// PUT endpoint for updating session (feedback, rating, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Session kontrol et - NextAuth v4
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    // Params'ı await et
    const resolvedParams = await params
    const sessionId = resolvedParams.sessionId

    const body = await request.json()
    const { effectivenessRating, userFeedback, sessionDuration } = body

    // JWT session'dan user email'ini al ve user'ı bul
    const userEmail = session.user.email!
    
    // User'ı email ile bul
    const { data: user, error: userFindError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .single()

    if (userFindError || !user) {
      console.log('User bulunamadı:', userFindError)
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    // Session'ın varlığını ve ownership'ini kontrol et
    const { data: existingSession, error: sessionCheckError } = await supabase
      .from('mood_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionCheckError || !existingSession) {
      console.log('Supabase session check error:', sessionCheckError)
      return NextResponse.json(
        { error: "Session bulunamadı veya erişim yetkiniz yok" },
        { status: 404 }
      )
    }

    // Session'ı güncelle
    const updateData: {
      effectiveness_rating?: number;
      user_feedback?: string;
      session_duration?: number;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString()
    }
    
    if (effectivenessRating !== undefined) {
      updateData.effectiveness_rating = Math.max(1, Math.min(5, parseInt(effectivenessRating)))
    }
    
    if (userFeedback !== undefined) {
      updateData.user_feedback = userFeedback.toString().substring(0, 1000)
    }
    
    if (sessionDuration !== undefined) {
      updateData.session_duration = Math.max(0, parseInt(sessionDuration))
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('mood_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError || !updatedSession) {
      console.error('Supabase update error:', updateError)
      return NextResponse.json(
        { error: "Session güncellenirken hata oluştu" },
        { status: 500 }
      )
    }

    console.log('✅ Supabase session updated:', {
      sessionId: updatedSession.id,
      effectivenessRating: updatedSession.effectiveness_rating,
      hasFeedback: !!updatedSession.user_feedback
    })

    return NextResponse.json({
      success: true,
      message: "Session başarıyla güncellendi",
      session: updatedSession
    })

  } catch (error) {
    console.error('🚨 Session update error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
    
    return NextResponse.json(
      { 
        error: "Session güncellenirken hata oluştu",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
