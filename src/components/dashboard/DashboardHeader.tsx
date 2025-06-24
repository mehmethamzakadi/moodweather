// src/components/dashboard/DashboardHeader.tsx
"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"

interface DashboardHeaderProps {
  session: Session
}

export default function DashboardHeader({ session }: DashboardHeaderProps) {
  const router = useRouter()

  return (
    <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">MoodWeather</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-white text-right">
              <p className="text-sm opacity-80">Hoş geldin,</p>
              <p className="font-semibold">{session.user?.name || session.user?.email}</p>
            </div>
            {session.user?.image && (
              <Image 
                src={session.user.image} 
                alt="Profile" 
                width={40}
                height={40}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
            )}
            <button
              onClick={() => router.push("/auth/signout")}
              className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}