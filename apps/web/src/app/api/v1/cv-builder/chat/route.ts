import { NextRequest } from "next/server"
import { Agent, run, tool } from "@openai/agents"
import { z } from "zod"
import { verifyAuth, getSupabaseAdmin } from "@/lib/auth.server"

// ============================================================================
// Request Schema
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
  message: z.string().min(1),
  cvData: CVDataSchema,
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
})

// ============================================================================
// Profile Fetcher
// ============================================================================

async function fetchProfileContext(userId: string): Promise<string> {
  const supabase = getSupabaseAdmin()

  const [profileRes, skillsRes, experiencesRes, educationsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, headline, about, email, location, linkedin_url")
        .eq("user_id", userId)
        .maybeSingle<{
          display_name: string | null
          headline: string | null
          about: string | null
          email: string | null
          location: string | null
          linkedin_url: string | null
        }>(),
      supabase
        .from("user_skills")
        .select("name, level, years")
        .eq("user_id", userId)
        .returns<{ name: string; level: number; years: number | null }[]>(),
      supabase
        .from("user_experiences")
        .select("title, company, start_date, end_date, highlights")
        .eq("user_id", userId)
        .returns<
          {
            title: string
            company: string | null
            start_date: string | null
            end_date: string | null
            highlights: string | null
          }[]
        >(),
      supabase
        .from("user_educations")
        .select("school, degree, field, start_year, end_year")
        .eq("user_id", userId)
        .returns<
          {
            school: string
            degree: string | null
            field: string | null
            start_year: number | null
            end_year: number | null
          }[]
        >(),
    ])

  const sections: string[] = []

  const profile = profileRes.data
  if (profile?.display_name) sections.push(`Name: ${profile.display_name}`)
  if (profile?.headline) sections.push(`Headline: ${profile.headline}`)
  if (profile?.about) sections.push(`About: ${profile.about}`)
  if (profile?.email) sections.push(`Email: ${profile.email}`)
  if (profile?.location) sections.push(`Location: ${profile.location}`)
  if (profile?.linkedin_url) sections.push(`LinkedIn: ${profile.linkedin_url}`)

  const skills = skillsRes.data ?? []
  if (skills.length > 0) {
    const skillList = skills
      .map((s) => {
        let str = s.name
        if (s.years) str += ` (${s.years}y)`
        return str
      })
      .join(", ")
    sections.push(`Skills: ${skillList}`)
  }

  const experiences = experiencesRes.data ?? []
  if (experiences.length > 0) {
    const expList = experiences
      .map((e) => {
        let str = e.title
        if (e.company) str += ` at ${e.company}`
        if (e.start_date || e.end_date) {
          str += ` (${e.start_date ?? "?"} - ${e.end_date ?? "present"})`
        }
        if (e.highlights) str += `\n  Highlights: ${e.highlights}`
        return str
      })
      .join("\n")
    sections.push(`Experience:\n${expList}`)
  }

  const educations = educationsRes.data ?? []
  if (educations.length > 0) {
    const eduList = educations
      .map((e) => {
        let str = e.school
        if (e.degree) str += ` - ${e.degree}`
        if (e.field) str += ` in ${e.field}`
        if (e.start_year || e.end_year) {
          str += ` (${e.start_year ?? "?"} - ${e.end_year ?? "?"})`
        }
        return str
      })
      .join("\n")
    sections.push(`Education:\n${eduList}`)
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "No profile data available."
}

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are the HireMePlz CV assistant — you help freelancers refine their AI-generated professional CVs.

## Context
The CV you see has already been AI-generated from the freelancer's raw profile data. Your job is to refine and improve it based on user requests — not to rewrite from scratch.

## Personality
- Direct, no fluff. Like a professional resume coach.
- No emojis. No excessive enthusiasm.
- Warm but professional.

## What you can help with
- Fine-tuning CV headlines and professional summaries
- Making experience descriptions more impactful (action verbs, metrics, outcomes)
- Tailoring the CV for specific roles, industries, or job postings
- Reorganizing or reprioritizing skills
- Adjusting tone, length, or emphasis of any section

## Rules
- The CV is already professionally written — focus on targeted refinements, not wholesale rewrites
- Use the freelancer's actual profile data and current CV state when making suggestions
- Never fabricate experience, skills, or achievements
- When you suggest changes, ALWAYS use the appropriate tool to apply them
- Keep prose responses concise — focus on what you changed and why
- If the user asks for a change, make it via tool call, then briefly explain what you did

## Tools
You have tools to update specific CV sections. Use them whenever the user asks for changes or you suggest improvements they agree to:
- update_personal_info: Update name, headline, email, location
- update_summary: Write or rewrite the professional summary
- update_experience: Edit a specific experience entry by index
- update_education: Edit a specific education entry by index
- update_skills: Replace the full skills list

When making updates:
- Apply changes via the tool FIRST, then explain what you changed in your text response
- For experience highlights, use strong action verbs and quantify results where possible
- For summaries, keep them 2-4 sentences, highlighting key value propositions

## Formatting
- Use proper markdown headings with # syntax
- Keep responses concise
- When listing suggestions, use numbered lists`

// ============================================================================
// Tool Definitions
// ============================================================================

const updatePersonalInfoParams = z.object({
  name: z.string().nullable().describe("Full name, or null to keep unchanged"),
  headline: z.string().nullable().describe("Professional headline, or null to keep unchanged"),
  email: z.string().nullable().describe("Email address, or null to keep unchanged"),
  location: z.string().nullable().describe("Location, or null to keep unchanged"),
})

const updateSummaryParams = z.object({
  summary: z.string().describe("The new professional summary text"),
})

const updateExperienceParams = z.object({
  index: z.number().describe("Zero-based index of the experience to update"),
  title: z.string().nullable().describe("Job title, or null to keep unchanged"),
  company: z.string().nullable().describe("Company name, or null to keep unchanged"),
  startDate: z.string().nullable().describe("Start date, or null to keep unchanged"),
  endDate: z.string().nullable().describe("End date, or null to keep unchanged"),
  highlights: z.string().nullable().describe("Key achievements and responsibilities, or null to keep unchanged"),
})

const updateEducationParams = z.object({
  index: z.number().describe("Zero-based index of the education entry to update"),
  school: z.string().nullable().describe("School name, or null to keep unchanged"),
  degree: z.string().nullable().describe("Degree type, or null to keep unchanged"),
  field: z.string().nullable().describe("Field of study, or null to keep unchanged"),
  startYear: z.number().nullable().describe("Start year, or null to keep unchanged"),
  endYear: z.number().nullable().describe("End year, or null to keep unchanged"),
})

const updateSkillsParams = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.number().min(1).max(5),
      years: z.number().nullable(),
    })
  ).describe("The complete updated skills list"),
})

// ============================================================================
// API Route
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    const { userId } = await verifyAuth(authHeader)

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

    const { message, cvData, conversationHistory } = parsed.data

    // Fetch fresh profile context
    const profileContext = await fetchProfileContext(userId)

    // Build conversation
    const historyText = conversationHistory
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n")

    const currentCVJson = JSON.stringify(cvData, null, 2)

    const userPrompt = [
      `## Freelancer Profile (from database)\n${profileContext}`,
      `## Current CV State\n${currentCVJson}`,
      historyText ? `## Conversation History\n${historyText}` : "",
      `## User Message\n${message}`,
    ]
      .filter(Boolean)
      .join("\n\n")

    // Tool definitions with closures for collecting updates
    const toolCalls: Array<{ name: string; args: Record<string, unknown> }> = []

    const updatePersonalInfo = tool({
      name: "update_personal_info",
      description: "Update CV personal information fields. Pass null for fields that should remain unchanged.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: updatePersonalInfoParams as any,
      execute: async (_input: unknown) => {
        const args = _input as z.infer<typeof updatePersonalInfoParams>
        toolCalls.push({ name: "update_personal_info", args: args as unknown as Record<string, unknown> })
        return "Personal info updated."
      },
    })

    const updateSummary = tool({
      name: "update_summary",
      description: "Set or rewrite the professional summary section of the CV.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: updateSummaryParams as any,
      execute: async (_input: unknown) => {
        const args = _input as z.infer<typeof updateSummaryParams>
        toolCalls.push({ name: "update_summary", args: args as unknown as Record<string, unknown> })
        return "Summary updated."
      },
    })

    const updateExperience = tool({
      name: "update_experience",
      description: "Update a specific experience entry by index. Pass null for fields that should remain unchanged.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: updateExperienceParams as any,
      execute: async (_input: unknown) => {
        const args = _input as z.infer<typeof updateExperienceParams>
        toolCalls.push({ name: "update_experience", args: args as unknown as Record<string, unknown> })
        return "Experience updated."
      },
    })

    const updateEducation = tool({
      name: "update_education",
      description: "Update a specific education entry by index. Pass null for fields that should remain unchanged.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: updateEducationParams as any,
      execute: async (_input: unknown) => {
        const args = _input as z.infer<typeof updateEducationParams>
        toolCalls.push({ name: "update_education", args: args as unknown as Record<string, unknown> })
        return "Education updated."
      },
    })

    const updateSkills = tool({
      name: "update_skills",
      description: "Replace the entire skills list on the CV.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parameters: updateSkillsParams as any,
      execute: async (_input: unknown) => {
        const args = _input as z.infer<typeof updateSkillsParams>
        toolCalls.push({ name: "update_skills", args: args as unknown as Record<string, unknown> })
        return "Skills updated."
      },
    })

    const agent = new Agent({
      name: "CV Builder Assistant",
      instructions: SYSTEM_PROMPT,
      model: "gpt-5-mini",
      tools: [updatePersonalInfo, updateSummary, updateExperience, updateEducation, updateSkills],
    })

    // Stream response
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const result = await run(agent, userPrompt, { stream: true })
          const textStream = result.toTextStream({
            compatibleWithNodeStreams: false,
          })

          for await (const chunk of textStream) {
            if (request.signal.aborted) break
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`
              )
            )
          }

          if (!request.signal.aborted) {
            await result.completed
          }

          // Emit tool calls after text is done
          for (const tc of toolCalls) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "tool_call", name: tc.name, args: tc.args })}\n\n`
              )
            )
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (error) {
          console.error("CV builder chat streaming error:", error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Streaming failed",
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
    console.error("CV builder chat error:", error)

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
          code: "chat_error",
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
