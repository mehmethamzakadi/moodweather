// src/app/api/mood/analyze/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  MoodAnalysisService,
  type MoodAnalysisRequest
} from "@/lib/mood/services"
import {
  MoodValidation,
  MoodErrorHandler
} from "@/lib/mood/validation"

class MoodAnalysisRouteHandler {
  private moodService: MoodAnalysisService

  constructor() {
    this.moodService = new MoodAnalysisService()
  }

  private async validateAndParseRequest(request: NextRequest): Promise<{
    userEmail: string
    body: MoodAnalysisRequest
  }> {
    // Validate session
    const session = await getServerSession(authOptions)
    const sessionValidation = MoodValidation.validateSession(session)
    if (!sessionValidation.isValid) throw sessionValidation.error

    // Parse request body
    const body: MoodAnalysisRequest = await request.json()
    const requestValidation = MoodValidation.validateMoodRequest(body)
    if (!requestValidation.isValid) throw requestValidation.error

    return {
      userEmail: session!.user!.email!,
      body
    }
  }

  private buildSuccessResponse(
    analysis: {
      moodAnalysis: string
      recommendedGenres: string[]
      energyLevel: string
      valence: string
      moodScore: number
      playlistTheme?: string
      environmentalContext?: unknown
    },
    sessionId: string,
    hasWeather: boolean
  ): NextResponse {
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      analysis: analysis,
      message: "Hava durumu destekli AI analiz tamamlandı",
      aiPowered: true,
      provider: "gemini",
      weatherEnhanced: hasWeather
    })
  }

  async handleMoodAnalysis(request: NextRequest): Promise<NextResponse> {
    try {
      // Validate and parse request
      const { userEmail, body } = await this.validateAndParseRequest(request)

      // Perform mood analysis
      const { analysis, sessionId } = await this.moodService.analyzeMood(body, userEmail)

      // Return success response
      return this.buildSuccessResponse(analysis, sessionId, !!body.weather)

    } catch (error) {
      if (error instanceof NextResponse) {
        return error
      }
      return MoodErrorHandler.handleGenericError(error)
    }
  }
}

export async function POST(request: NextRequest) {
  const handler = new MoodAnalysisRouteHandler()
  return handler.handleMoodAnalysis(request)
}