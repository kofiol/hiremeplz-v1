import "server-only"
import { Agent, run } from "@openai/agents"
import { z } from "zod"
import type { UserContext } from "@/lib/user-context.server"

// ============================================================================
// Types
// ============================================================================

const JobQuerySchema = z.object({
  queries: z
    .array(
      z.object({
        keyword: z.string(),
        location: z.string(),
        country: z.string(),
        time_range: z.enum(["Past 24 hours", "Past week", "Past month"]),
      }),
    )
    .min(1)
    .max(3),
  reasoning: z.string(),
})

export type JobQueryResult = z.infer<typeof JobQuerySchema>

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are a job search query optimizer for LinkedIn. Your job is to generate 1-3 search queries that will find the best freelance/contract opportunities for the user.

## Query Strategy
Generate queries in this priority order:
1. **Core skills** — The user's primary skillset combined into a recruiter-friendly job title
2. **Adjacent skills** — Related roles the user could fill based on overlapping skills
3. **Broad/niche** — Either a broader catch-all or a highly specific niche query

## Keyword Rules
- Use 2-5 words per keyword, combining key skills with a role word
- Examples: "React TypeScript developer", "Next.js fullstack engineer", "Node.js backend developer"
- Combine 2-3 top skills + a role word (developer, engineer, designer, etc.)
- Do NOT use overly long keywords (bad: "Senior Fullstack Developer TypeScript Next.js")
- Do NOT use generic terms like "developer" alone

## Tightness Guide
The user has a tightness preference (1-5):
- **1-2 (broad):** Use broader, more general keywords. Cast a wide net. Use "Past month" for time range.
- **3 (balanced):** Mix of specific and broad. Use "Past week" for time range.
- **4-5 (tight):** Use exact skill combinations and specific role titles. Use "Past week" or "Past 24 hours".

## Location Rules
- Use a real geographic location (city, state, or country name) for the location field
- Examples: "Texas", "New York", "San Francisco", "London", "Berlin"
- NEVER use "Remote" as a location — BrightData needs real places. Use the user's location, or a major tech hub like "New York" or "California"
- If the user has no location, use "United States" as the location
- The country field MUST be a 2-letter ISO 3166-1 alpha-2 code (e.g., "US", "GB", "DE", "CA", "AU", "FR", "IL")
- NEVER use full country names like "United States" for the country field — always use codes like "US"

## Time Range
- Default to "Past week" for most queries
- Use "Past month" for niche skills or broad searches at tightness 1-2
- Use "Past 24 hours" only at tightness 4-5 for common skill combinations

## Output
- Always provide clear reasoning explaining your query choices
- Tailor queries to the user's actual skills and experience level`

// ============================================================================
// Public API
// ============================================================================

export async function generateJobQueries(ctx: UserContext): Promise<JobQueryResult> {
  const skillNames = ctx.skills.map((s) => s.name)
  const experienceSummary = ctx.experiences
    .slice(0, 5)
    .map((e) => `${e.title}${e.company ? ` at ${e.company}` : ""}`)
    .join("; ")

  const prompt = `Generate LinkedIn job search queries for this freelancer:

## Profile
- Name: ${ctx.profile.displayName ?? "Unknown"}
- Headline: ${ctx.profile.headline ?? "Not set"}
- About: ${ctx.profile.about ?? "Not provided"}
- Location: ${ctx.profile.location ?? "Not specified"}
- Country: ${ctx.profile.countryCode ?? "Not specified"}

## Skills
${skillNames.length > 0 ? skillNames.join(", ") : "No skills listed"}

## Experience
${experienceSummary || "No experience listed"}

## Preferences
- Tightness: ${ctx.preferences.tightness} (1=broad, 5=tight)
- Platforms: ${ctx.preferences.platforms.length > 0 ? ctx.preferences.platforms.join(", ") : "Any"}
- Rate: ${ctx.preferences.currency} ${ctx.preferences.hourlyMin ?? "?"}–${ctx.preferences.hourlyMax ?? "?"}/hr

Generate 1-3 optimized LinkedIn search queries based on this profile.`

  const agent = new Agent({
    name: "Job Query Builder",
    model: "gpt-4.1-mini",
    instructions: SYSTEM_PROMPT,
    outputType: JobQuerySchema,
  })

  const result = await run(agent, prompt)
  return result.finalOutput as JobQueryResult
}
