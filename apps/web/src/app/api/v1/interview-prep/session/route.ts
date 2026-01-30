import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, verifyAuth } from "@/lib/auth.server"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const body = await request.json()
    const interviewType = body.interviewType as string

    if (
      !interviewType ||
      !["client_discovery", "technical", "rate_negotiation", "behavioral"].includes(interviewType)
    ) {
      return NextResponse.json(
        { error: { code: "invalid_type", message: "Invalid interview type" } },
        { status: 400 }
      )
    }

    // Create interview session record
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("interview_sessions")
      .insert({
        team_id: teamId,
        user_id: userId,
        interview_type: interviewType,
        status: "pending",
      })
      .select("id")
      .single<{ id: string }>()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: { code: "session_create_failed", message: "Failed to create session" } },
        { status: 500 }
      )
    }

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
      const errText = await realtimeResponse.text()
      console.error("OpenAI Realtime session error:", errText)
      return NextResponse.json(
        { error: { code: "realtime_failed", message: "Failed to create realtime session" } },
        { status: 502 }
      )
    }

    const realtimeData = await realtimeResponse.json()

    return NextResponse.json({
      sessionId: session.id,
      clientSecret: realtimeData.client_secret?.value ?? null,
      interviewType,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
