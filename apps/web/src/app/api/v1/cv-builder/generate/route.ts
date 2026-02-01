import { NextRequest } from "next/server"
import { Agent, run } from "@openai/agents"
import { z } from "zod"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"
import { CV_GENERATION_SYSTEM_PROMPT } from "@/lib/cv-generation-prompt"

// ============================================================================
// Schema
// ============================================================================

const CVDataSchema = z.object({
  personalInfo: z.object({
    name: z.string(),
    headline: z.string(),
    email: z.string(),
    location: z.string(),
    linkedinUrl: z.string(),
  }),
  summary: z.string(),
  experiences: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      highlights: z.string(),
    })
  ),
  educations: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      field: z.string(),
      startYear: z.number().nullable(),
      endYear: z.number().nullable(),
    })
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.number(),
      years: z.number().nullable(),
    })
  ),
})

const RequestSchema = z.object({
  rawProfileData: CVDataSchema,
})

// ============================================================================
// API Route
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId, teamId } = await verifyAuth(authHeader)

    const json = await request.json()
    const parsed = RequestSchema.safeParse(json)

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "invalid_payload",
            message: "Invalid request payload",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { rawProfileData } = parsed.data

    const agent = new Agent({
      name: "CV Generator",
      instructions: CV_GENERATION_SYSTEM_PROMPT,
      model: "gpt-4.1-mini",
      outputType: CVDataSchema,
    })

    const userPrompt = `Here is the freelancer's raw profile data. Transform it into a professional, polished CV:\n\n${JSON.stringify(rawProfileData, null, 2)}`

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "progress", message: "Analyzing your profile..." })}\n\n`
            )
          )

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "progress", message: "Crafting professional CV..." })}\n\n`
            )
          )

          const result = await run(agent, userPrompt)
          const generatedCV = result.finalOutput

          if (!generatedCV) {
            throw new Error("AI did not produce a valid CV")
          }

          // Upsert into generated_cvs
          const supabase = getSupabaseAdmin()
          const { error: upsertError } = await supabase
            .from("generated_cvs")
            .upsert(
              {
                user_id: userId,
                team_id: teamId,
                cv_data: generatedCV,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            )

          if (upsertError) {
            console.error("Failed to save generated CV:", upsertError)
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "cv_generated", data: generatedCV })}\n\n`
            )
          )

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("CV generation streaming error:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "CV generation failed",
              })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("CV generation error:", error)

    if (
      error instanceof Error &&
      (error.message === "Missing or invalid Authorization header" ||
        error.message === "Unauthorized")
    ) {
      return Response.json(
        { error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      )
    }

    return Response.json(
      {
        error: {
          code: "generation_error",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}
