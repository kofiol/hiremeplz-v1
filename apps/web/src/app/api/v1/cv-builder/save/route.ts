import { NextRequest } from "next/server"
import { z } from "zod"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

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
  cvData: CVDataSchema,
})

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

    const { cvData } = parsed.data

    const supabase = getSupabaseAdmin()
    const { error: upsertError } = await supabase
      .from("generated_cvs")
      .upsert(
        {
          user_id: userId,
          team_id: teamId,
          cv_data: cvData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (upsertError) {
      console.error("Failed to save CV:", upsertError)
      return Response.json(
        { error: { code: "save_error", message: "Failed to save CV" } },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
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
          code: "save_error",
          message:
            error instanceof Error ? error.message : "Failed to save CV",
        },
      },
      { status: 500 }
    )
  }
}
