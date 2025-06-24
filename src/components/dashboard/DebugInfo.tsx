// src/components/dashboard/DebugInfo.tsx
"use client"

import Card from "@/components/ui/card"
import { Session } from "next-auth"
import { WeatherData } from "@/lib/weather/api"

interface DebugInfoProps {
  session: Session
  currentWeather: WeatherData | null
}

export default function DebugInfo({ session, currentWeather }: DebugInfoProps) {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <Card variant="glass" padding="md">
      <h3 className="text-lg font-semibold text-white mb-4">🔧 Debug Bilgileri</h3>
      <div className="space-y-2 text-sm">
        <div className="text-green-300">
          <strong>Session:</strong> {JSON.stringify(session?.user, null, 2)}
        </div>
        {currentWeather && (
          <div className="text-blue-300">
            <strong>Weather:</strong> {JSON.stringify(currentWeather, null, 2)}
          </div>
        )}
      </div>
    </Card>
  )
}