import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth.server"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    await verifyAuth(authHeader)

    // Fetch ephemeral token from OpenAI Realtime API
    const realtimeResponse = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          voice: "alloy",
          modalities: ["audio", "text"],
          input_audio_transcription: {
            model: "whisper-1",
          },
        }),
      }
    )

    if (!realtimeResponse.ok) {
      const errBody = await realtimeResponse.text()
      console.error("OpenAI Realtime session error:", realtimeResponse.status, errBody)
      return NextResponse.json(
        {
          error: {
            code: "realtime_failed",
            message: "Failed to create realtime session",
            details: errBody,
          },
        },
        { status: 502 }
      )
    }

    const realtimeData = await realtimeResponse.json()

    const clientSecret = realtimeData.client_secret?.value ?? null
    if (!clientSecret) {
      console.error("No client_secret in response:", JSON.stringify(realtimeData).slice(0, 500))
      return NextResponse.json(
        {
          error: {
            code: "no_secret",
            message: "OpenAI did not return a client secret",
          },
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ clientSecret })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
