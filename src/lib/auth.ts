// src/lib/auth.ts - NextAuth v4 Pure JWT Configuration
import { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import SpotifyProvider from "next-auth/providers/spotify"


// Spotify API scopes - Genişletilmiş
const scopes = [
  "user-read-email",
  "user-read-private", 
  "user-read-recently-played",
  "user-top-read",
  "user-library-read",
  "user-library-modify",
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing"
].join(" ")

export const authOptions: NextAuthOptions = {

  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
          show_dialog: "true", // Force Spotify login dialog
          prompt: "login" // Force re-authentication
        },
      },
    }),
  ],
  // Cookie ayarları - 127.0.0.1 için
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false, // HTTP için false
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
        maxAge: 60 * 15, // 15 minutes
      },
    },
  },
  callbacks: {
    async jwt({ token, account, user }): Promise<JWT> {
      // İlk giriş sırasında Spotify bilgilerini kaydet
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at! * 1000,
          spotifyId: account.providerAccountId,
          userId: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        } as JWT
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
      const extendedSession = session as typeof session & {
        accessToken?: string;
        spotifyId?: string;
        error?: string;
      }
      
      if (token.accessToken) {
        extendedSession.accessToken = token.accessToken as string
      }
      if (token.spotifyId) {
        extendedSession.spotifyId = token.spotifyId as string
      }
      if (token.error) {
        extendedSession.error = token.error as string
      }
      
      // User bilgilerini token'dan al
      if (session.user) {
        session.user.id = token.userId as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
      }

      return extendedSession
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
  events: {
    async signOut() {
      console.log('NextAuth signOut event triggered')
    }
  }
}

// Spotify access token'ını yenileme fonksiyonu
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    // refreshToken var mı kontrol et
    if (!token.refreshToken) {
      throw new Error("No refresh token available")
    }

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
    } as JWT
  } catch (error) {
    console.error("Error refreshing access token:", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    } as JWT
  }
}
