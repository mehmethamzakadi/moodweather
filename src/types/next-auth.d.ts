// src/types/next-auth.d.ts - NextAuth v4 Types
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    spotifyId?: string
    error?: string
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    spotifyId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    spotifyId?: string
    error?: string
    userId?: string
    email?: string
    name?: string
    image?: string
  }
}
