// src/app/api/auth/force-logout/route.ts
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    console.log('🔴 Force logout API called')
    
    // NextAuth cookie'lerini server-side'da sil
    const cookieStore = await cookies()
    
    const nextAuthCookies = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      'next-auth.state',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.csrf-token'
    ]
    
    nextAuthCookies.forEach(cookieName => {
      cookieStore.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      console.log(`🗑️ Server-side deleted: ${cookieName}`)
    })
    
    return NextResponse.json({
      success: true,
      message: "Server-side session cleared"
    })
    
  } catch (error) {
    console.error('Force logout error:', error)
    return NextResponse.json(
      { error: "Force logout failed" },
      { status: 500 }
    )
  }
}
