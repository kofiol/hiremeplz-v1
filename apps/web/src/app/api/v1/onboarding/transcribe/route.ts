import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth.server"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    await verifyAuth(authHeader)

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: { code: "no_file", message: "No audio file provided" } },
        { status: 400 }
      )
    }

    // Forward to OpenAI Whisper
    const whisperForm = new FormData()
    whisperForm.append("file", file, "recording.webm")
    whisperForm.append("model", "whisper-1")

    const whisperRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: whisperForm,
      }
    )

    if (!whisperRes.ok) {
      const errBody = await whisperRes.text()
      console.error("Whisper error:", whisperRes.status, errBody)
      return NextResponse.json(
        {
          error: {
            code: "transcription_failed",
            message: "Failed to transcribe audio",
          },
        },
        { status: 502 }
      )
    }

    const result = await whisperRes.json()
    return NextResponse.json({ text: result.text })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized"
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
