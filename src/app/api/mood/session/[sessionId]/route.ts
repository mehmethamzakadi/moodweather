// src/app/api/mood/session/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    console.log('Session API called with sessionId:', sessionId)

    // Session kontrol et
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('No authenticated user')
      return NextResponse.json(
        { error: "Giriş yapmış kullanıcı gerekli" },
        { status: 401 }
      )
    }

    console.log('Authenticated user:', session.user.email)

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      console.log('User not found:', session.user.email)
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    console.log('User found:', user.id)

    // Mood session'ını bul
    const moodSession = await prisma.moodSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id, // Sadece kendi session'larına erişim
      },
    })

    console.log('MoodSession search result:', moodSession ? 'Found' : 'Not found')

    if (!moodSession) {
      return NextResponse.json(
        { error: "Session bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: moodSession,
    })

  } catch (error) {
    console.error('Session fetch hatası:', error)
    
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