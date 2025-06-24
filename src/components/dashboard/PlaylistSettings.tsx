// src/components/dashboard/PlaylistSettings.tsx
"use client"

import Toggle from "@/components/ui/toggle"
import Card from "@/components/ui/card"

interface PlaylistSettingsProps {
  includeTurkish: boolean
  setIncludeTurkish: (value: boolean) => void
  isPlaylistPrivate: boolean
  setIsPlaylistPrivate: (value: boolean) => void
}

export default function PlaylistSettings({
  includeTurkish,
  setIncludeTurkish,
  isPlaylistPrivate,
  setIsPlaylistPrivate
}: PlaylistSettingsProps) {
  return (
    <Card variant="glass" padding="md">
      <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
        <span>Playlist Ayarları</span>
      </h3>
      
      <div className="space-y-4">
        <Toggle
          checked={includeTurkish}
          onChange={setIncludeTurkish}
          label="Türkçe Şarkılar"
          description={includeTurkish ? "Türkçe + Yabancı karışık" : "Sadece yabancı müzik"}
          icon={<span className="text-lg">{includeTurkish ? "🇹🇷" : "🌍"}</span>}
          color="blue"
          size="md"
        />
        
        <Toggle
          checked={isPlaylistPrivate}
          onChange={setIsPlaylistPrivate}
          label="Gizli Playlist"
          description={isPlaylistPrivate ? "Sadece senin görebileceğin" : "Herkese açık playlist"}
          icon={<span className="text-lg">{isPlaylistPrivate ? "🔒" : "🌍"}</span>}
          color="purple"
          size="md"
        />
      </div>
    </Card>
  )
}