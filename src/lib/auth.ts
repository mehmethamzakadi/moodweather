// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { JWT } from "next-auth/jwt"

// Spotify API scopes - hangi izinlere ihtiyacımız var
const scopes = [
  "user-read-email",
  "user-read-private", 
  "user-read-recently-played",
  "user-top-read",
  "user-library-read",
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private"
].join(" ")

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development",
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
          // show_dialog kaldırıldı - cookie sorunlarına sebep olabilir
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // İlk giriş sırasında Spotify bilgilerini kaydet
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at! * 1000,
          spotifyId: account.providerAccountId,
        }
      }

      // Token'ın süresi dolmamışsa mevcut token'ı döndür
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Token'ın süresi dolmuşsa yenile
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      // Session'a token bilgilerini ekle
      session.accessToken = token.accessToken as string
      session.spotifyId = token.spotifyId as string
      session.error = token.error as string

      return session
    },
  },
  events: {
    async signOut(message) {
      console.log('User signed out:', message)
      // Burada ek temizlik işlemleri yapabilirsin (isteğe bağlı)
    },
    async signIn(message) {
      console.log('User signed in:', message)
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signout",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 saat
  },
  cookies: {
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // HTTP için false
        maxAge: 900, // 15 dakika
        domain: undefined, // Subdomain sorunlarını önler
      },
    },
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        maxAge: 24 * 60 * 60, // 24 saat
        domain: undefined,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        maxAge: 900,
        domain: undefined,
      },
    },
  },
}

// Spotify access token'ını yenileme fonksiyonu
async function refreshAccessToken(token: any) {
  try {
    const url = "https://accounts.spotify.com/api/token"

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error("Error refreshing access token:", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}//s