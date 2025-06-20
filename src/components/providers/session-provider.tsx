// src/components/providers/session-provider.tsx - NextAuth v4
"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

interface AuthSessionProviderProps {
  children: ReactNode
}

export default function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return (
    <SessionProvider 
      refetchInterval={0} // Session auto-refresh'i kapat
      refetchOnWindowFocus={true} // Window focus'ta kontrol et
    >
      {children}
    </SessionProvider>
  )
}
