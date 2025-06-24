// src/components/dashboard/MoodInputForm.tsx
"use client"

import { useState } from "react"
import Card from "@/components/ui/card"

interface MoodInputFormProps {
  onSubmit: (mood: string) => void
  isAnalyzing: boolean
}

export default function MoodInputForm({ onSubmit, isAnalyzing }: MoodInputFormProps) {
  const [moodInput, setMoodInput] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!moodInput.trim() || isAnalyzing) return
    onSubmit(moodInput.trim())
    setMoodInput("")
  }

  const quickMoods = [
    { emoji: "😴", text: "Yorgun", mood: "Çok yorgun ve dinlenmeye ihtiyacım var" },
    { emoji: "😰", text: "Stresli", mood: "Stresli hissediyorum, sakinleşmek istiyorum" },
    { emoji: "😊", text: "Mutlu", mood: "Kendimi harika hissediyorum, enerjik müzikler dinlemek istiyorum" },
    { emoji: "😔", text: "Melankolik", mood: "Biraz melankolik hissediyorum, duygusal müzikler dinlemek istiyorum" },
    { emoji: "⚡", text: "Enerjik", mood: "Çok enerjik hissediyorum, dans edebileceğim müzikler istiyorum" },
    { emoji: "🧘", text: "Huzurlu", mood: "Huzurlu ve sakin hissediyorum, rahatlatıcı müzikler dinlemek istiyorum" },
  ]

  return (
    <div className="space-y-6">
      {/* Main Input Form */}
      <Card variant="gradient" padding="lg">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            🎭 Ruh Halin Nasıl?
          </h2>
          <p className="text-white/80 text-lg">
            Şu anki hislerini bizimle paylaş, sana uygun müzik önerelim
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="mood" className="block text-white font-medium mb-3">
              Bugün kendini nasıl hissediyorsun?
            </label>
            <textarea
              id="mood"
              value={moodInput}
              onChange={(e) => setMoodInput(e.target.value)}
              placeholder="Örnek: Yorgun ve stresli hissediyorum, biraz dinlenmek istiyorum..."
              className="w-full h-32 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-200 resize-none"
              disabled={isAnalyzing}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              type="submit"
              disabled={!moodInput.trim() || isAnalyzing}
              className="flex-1 sm:flex-none bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI Analizi Başlat</span>
                </>
              )}
            </button>
            
            <div className="text-white/60 text-sm text-center sm:text-left">
              ✨ AI destekli kişiselleştirilmiş müzik önerileri
            </div>
          </div>
        </form>
      </Card>

      {/* Quick Mood Buttons */}
      <Card variant="glass" padding="md">
        <h3 className="text-white font-semibold mb-4 text-center">Hızlı Seçim</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickMoods.map((quickMood) => (
            <button
              key={quickMood.text}
              onClick={() => setMoodInput(quickMood.mood)}
              disabled={isAnalyzing}
              className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex flex-col items-center space-y-1"
            >
              <span className="text-2xl">{quickMood.emoji}</span>
              <span className="text-xs font-medium">{quickMood.text}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}