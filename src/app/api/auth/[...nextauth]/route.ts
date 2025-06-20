// src/app/api/auth/[...nextauth]/route.ts - NextAuth v4 App Router Fix
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// NextAuth v4 handler for App Router
const handler = NextAuth(authOptions)

// Export the handler for GET and POST requests
export const GET = handler
export const POST = handler
