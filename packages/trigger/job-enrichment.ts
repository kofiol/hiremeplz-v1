/**
 * Job Enrichment Task
 *
 * A trigger.dev task that enriches jobs with AI-generated summaries,
 * seniority classification, markdown descriptions, embeddings, and rankings.
 *
 * Chained after linkedin-job-search. Uses raw fetch() for OpenAI + PostgREST
 * (no @openai/agents — it uses server-only import).
 */

import { logger, schemaTask } from "@trigger.dev/sdk/v3"
import { z } from "zod"

// ============================================================================
// Constants
// ============================================================================

const EMBED_MODEL = "text-embedding-3-small"
const CHAT_MODEL = "gpt-4.1-mini"
const EMBED_BATCH_SIZE = 100
const ENRICH_BATCH_SIZE = 5
const RANK_BATCH_SIZE = 5

// ============================================================================
// Input Schema
// ============================================================================

const JobEnrichmentInputSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  agentRunId: z.string().uuid(),
})

export type JobEnrichmentInput = z.infer<typeof JobEnrichmentInputSchema>

// ============================================================================
// Helpers
// ============================================================================

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return { url, serviceRoleKey }
}

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error("Missing OPENAI_API_KEY")
  return key
}

async function supabaseGet<T>(path: string): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase GET ${path} failed: ${response.status} - ${text}`)
  }
  return response.json() as Promise<T>
}

async function supabasePatch(path: string, body: Record<string, unknown>): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    logger.error(`Supabase PATCH ${path} failed: ${response.status} - ${text}`)
  }
}

async function supabasePost<T>(path: string, body: unknown): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase POST ${path} failed: ${response.status} - ${text}`)
  }
  return response.json() as Promise<T>
}

async function supabaseRpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase RPC ${fn} failed: ${response.status} - ${text}`)
  }
  return response.json() as Promise<T>
}

async function updateAgentRun(agentRunId: string, update: Record<string, unknown>) {
  await supabasePatch(`agent_runs?id=eq.${agentRunId}`, update)
}

// ============================================================================
// OpenAI Helpers
// ============================================================================

async function callEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = getOpenAIKey()
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI embeddings failed: ${response.status} - ${text}`)
  }
  const data = (await response.json()) as {
    data: { embedding: number[]; index: number }[]
  }
  // Sort by index to maintain order
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

async function callChatStructured<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const apiKey = getOpenAIKey()
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "output",
          strict: true,
          schema,
        },
      },
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI chat failed: ${response.status} - ${text}`)
  }
  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }
  return JSON.parse(data.choices[0].message.content) as T
}

// ============================================================================
// JSON Schemas for Structured Output
// ============================================================================

const ENRICH_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    jobs: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          ai_seniority: { type: "string" as const, enum: ["junior", "mid", "senior"] },
          ai_summary: { type: "string" as const },
          description_md: { type: "string" as const },
        },
        required: ["id", "ai_seniority", "ai_summary", "description_md"],
        additionalProperties: false,
      },
    },
  },
  required: ["jobs"],
  additionalProperties: false,
}

const RANK_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    jobs: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          score: { type: "number" as const },
          breakdown: {
            type: "object" as const,
            properties: {
              skill_match: { type: "number" as const },
              budget_fit: { type: "number" as const },
              client_quality: { type: "number" as const },
              scope_fit: { type: "number" as const },
              win_probability: { type: "number" as const },
            },
            required: ["skill_match", "budget_fit", "client_quality", "scope_fit", "win_probability"],
            additionalProperties: false,
          },
          reasoning: { type: "string" as const },
        },
        required: ["id", "score", "breakdown", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["jobs"],
  additionalProperties: false,
}

// ============================================================================
// System Prompts
// ============================================================================

const ENRICH_SYSTEM_PROMPT = `You are a job posting enrichment assistant. For each job, you must:

1. **ai_seniority** — Classify as "junior", "mid", or "senior" based on:
   - Years of experience required (0-2 = junior, 3-5 = mid, 6+ = senior)
   - Skill complexity and leadership expectations
   - Budget/rate (higher rates suggest senior)
   - If unclear, default to "mid"

2. **ai_summary** — Write 2-3 concise sentences covering:
   - What the role does day-to-day
   - Key technologies or skills required
   - Any standout details (remote, equity, growth potential)

3. **description_md** — Rewrite the raw description as clean Markdown with proper structure:
   - Use ## headings: "Role", "Responsibilities", "Requirements", "Nice to Have", "About the Company"
   - Use bullet lists for items
   - Remove duplicate info, fix formatting, preserve all meaningful content
   - If a section has no content, omit it entirely
   - Keep it professional and scannable

Always return the same job IDs you received.`

const RANK_SYSTEM_PROMPT = `You are a job-candidate match scorer. For each job, evaluate how well it matches the freelancer's profile.

## Scoring Weights
- **skill_match (30%)** — How well do the job's required skills overlap with the freelancer's skills?
- **budget_fit (25%)** — Does the job's budget/rate align with the freelancer's rate expectations?
- **client_quality (15%)** — Client rating, hire count, payment verification, company reputation
- **scope_fit (15%)** — Does the project scope/type match the freelancer's preferred work style?
- **win_probability (15%)** — Given competition level and the freelancer's experience, how likely are they to win?

## Overall Score
The overall score is a weighted average: skill_match*0.30 + budget_fit*0.25 + client_quality*0.15 + scope_fit*0.15 + win_probability*0.15

## Rules
- Each sub-score is 0-100
- The reasoning should be 1-2 sentences explaining the main factors
- Be honest — a poor match should score low
- Always return the same job IDs you received`

// ============================================================================
// Pipeline Types
// ============================================================================

type JobRow = {
  id: string
  title: string
  description: string
  skills: string[]
  seniority: string | null
  budget_type: string
  hourly_min: number | null
  hourly_max: number | null
  fixed_budget_min: number | null
  fixed_budget_max: number | null
  client_rating: number | null
  client_hires: number | null
  client_payment_verified: boolean | null
}

type ProfileRow = {
  display_name: string | null
  headline: string | null
  about: string | null
  location: string | null
  country_code: string | null
}

type SkillRow = { name: string; level: number; years: number | null }
type ExperienceRow = {
  title: string
  company: string | null
  start_date: string | null
  end_date: string | null
  highlights: string | null
}
type PreferencesRow = {
  hourly_min: number | null
  hourly_max: number | null
  currency: string
  tightness: number
  platforms: string[]
  project_types: string[]
}

// ============================================================================
// The Task
// ============================================================================

export const enrichJobs = schemaTask({
  id: "job-enrichment",
  schema: JobEnrichmentInputSchema,

  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },

  maxDuration: 600,

  run: async (payload) => {
    const { teamId, userId, agentRunId } = payload

    try {
      await updateAgentRun(agentRunId, {
        status: "running",
        started_at: new Date().toISOString(),
      })

      // ── Step 1: Build user profile context ──────────────────────────────

      logger.info("Step 1: Fetching user profile for context")

      const [profiles, skills, experiences, preferences] = await Promise.all([
        supabaseGet<ProfileRow[]>(
          `profiles?user_id=eq.${userId}&select=display_name,headline,about,location,country_code&limit=1`,
        ),
        supabaseGet<SkillRow[]>(
          `user_skills?user_id=eq.${userId}&select=name,level,years`,
        ),
        supabaseGet<ExperienceRow[]>(
          `user_experiences?user_id=eq.${userId}&select=title,company,start_date,end_date,highlights`,
        ),
        supabaseGet<PreferencesRow[]>(
          `user_preferences?user_id=eq.${userId}&select=hourly_min,hourly_max,currency,tightness,platforms,project_types&limit=1`,
        ),
      ])

      const profile = profiles[0] ?? null
      const prefs = preferences[0] ?? null

      const contextParts: string[] = []
      if (profile?.display_name) contextParts.push(`Name: ${profile.display_name}`)
      if (profile?.headline) contextParts.push(`Headline: ${profile.headline}`)
      if (profile?.about) contextParts.push(`About: ${profile.about}`)
      if (skills.length > 0) {
        contextParts.push(
          `Skills: ${skills.map((s) => `${s.name}${s.years ? ` (${s.years}y)` : ""}`).join(", ")}`,
        )
      }
      if (experiences.length > 0) {
        const expStr = experiences
          .slice(0, 5)
          .map((e) => `${e.title}${e.company ? ` at ${e.company}` : ""}`)
          .join("; ")
        contextParts.push(`Experience: ${expStr}`)
      }
      if (prefs?.hourly_min || prefs?.hourly_max) {
        contextParts.push(
          `Rate: ${prefs.currency ?? "USD"} ${prefs.hourly_min ?? "?"}–${prefs.hourly_max ?? "?"}/hr`,
        )
      }

      const userContextStr =
        contextParts.length > 0
          ? contextParts.join("\n")
          : "No profile data available."

      // ── Step 2: Embed user profile ──────────────────────────────────────

      logger.info("Step 2: Embedding user profile")

      const profileEmbedText = userContextStr
      const [profileEmbedding] = await callEmbeddings([profileEmbedText])

      // Store profile embedding
      await supabasePatch(`profiles?user_id=eq.${userId}`, {
        embedding: JSON.stringify(profileEmbedding),
        embedding_updated_at: new Date().toISOString(),
      })

      // ── Step 3: Embed unenriched jobs ───────────────────────────────────

      logger.info("Step 3: Fetching and embedding unenriched jobs")

      const unenrichedJobs = await supabaseGet<JobRow[]>(
        `jobs?team_id=eq.${teamId}&embedding=is.null&select=id,title,description,skills,seniority,budget_type,hourly_min,hourly_max,fixed_budget_min,fixed_budget_max,client_rating,client_hires,client_payment_verified&limit=500`,
      )

      logger.info(`Found ${unenrichedJobs.length} unenriched jobs`)

      let embeddedCount = 0
      for (let i = 0; i < unenrichedJobs.length; i += EMBED_BATCH_SIZE) {
        const batch = unenrichedJobs.slice(i, i + EMBED_BATCH_SIZE)
        const texts = batch.map(
          (j) => `${j.title}\n${j.description.slice(0, 2000)}`,
        )

        const embeddings = await callEmbeddings(texts)

        // Update each job's embedding
        for (let k = 0; k < batch.length; k++) {
          await supabasePatch(`jobs?id=eq.${batch[k].id}`, {
            embedding: JSON.stringify(embeddings[k]),
          })
        }

        embeddedCount += batch.length
        logger.info(`Embedded ${embeddedCount}/${unenrichedJobs.length} jobs`)
      }

      // ── Step 4: Shortlist top 50 by similarity ──────────────────────────

      logger.info("Step 4: Shortlisting top 50 jobs by embedding similarity")

      const matches = await supabaseRpc<{ job_id: string; similarity: number }[]>(
        "match_jobs_by_embedding",
        {
          p_team_id: teamId,
          p_embedding: JSON.stringify(profileEmbedding),
          p_match_count: 50,
          p_match_threshold: 0.2,
        },
      )

      logger.info(`Shortlisted ${matches.length} jobs`)

      if (matches.length === 0) {
        await updateAgentRun(agentRunId, {
          status: "succeeded",
          outputs: {
            jobs_embedded: embeddedCount,
            jobs_shortlisted: 0,
            jobs_enriched: 0,
            jobs_ranked: 0,
          },
          finished_at: new Date().toISOString(),
        })
        return
      }

      // Fetch full job data for shortlisted jobs
      const matchedIds = matches.map((m) => m.job_id)
      const shortlistedJobs = await supabaseGet<JobRow[]>(
        `jobs?id=in.(${matchedIds.join(",")})&select=id,title,description,skills,seniority,budget_type,hourly_min,hourly_max,fixed_budget_min,fixed_budget_max,client_rating,client_hires,client_payment_verified`,
      )

      // ── Step 5: AI enrich ───────────────────────────────────────────────

      logger.info("Step 5: AI enriching shortlisted jobs")

      // Only enrich jobs that haven't been enriched yet
      const toEnrich = shortlistedJobs.filter(
        (j) => !unenrichedJobs.find((uj) => uj.id === j.id) || true,
      )

      let enrichedCount = 0
      for (let i = 0; i < toEnrich.length; i += ENRICH_BATCH_SIZE) {
        const batch = toEnrich.slice(i, i + ENRICH_BATCH_SIZE)

        const prompt = `Enrich the following ${batch.length} job(s):\n\n${batch
          .map(
            (j, idx) =>
              `### Job ${idx + 1} (id: ${j.id})\n**Title:** ${j.title}\n**Description:**\n${j.description}`,
          )
          .join("\n\n---\n\n")}`

        try {
          const result = await callChatStructured<{
            jobs: {
              id: string
              ai_seniority: string
              ai_summary: string
              description_md: string
            }[]
          }>(ENRICH_SYSTEM_PROMPT, prompt, ENRICH_JSON_SCHEMA)

          for (const enriched of result.jobs) {
            await supabasePatch(`jobs?id=eq.${enriched.id}`, {
              ai_seniority: enriched.ai_seniority,
              ai_summary: enriched.ai_summary,
              description_md: enriched.description_md,
              enriched_at: new Date().toISOString(),
            })
          }

          enrichedCount += result.jobs.length
          logger.info(`Enriched ${enrichedCount}/${toEnrich.length} jobs`)
        } catch (err) {
          logger.error(`Enrich batch failed`, {
            error: err instanceof Error ? err.message : "Unknown",
          })
        }
      }

      // ── Step 6: AI rank ─────────────────────────────────────────────────

      logger.info("Step 6: AI ranking shortlisted jobs")

      let rankedCount = 0
      for (let i = 0; i < shortlistedJobs.length; i += RANK_BATCH_SIZE) {
        const batch = shortlistedJobs.slice(i, i + RANK_BATCH_SIZE)

        const prompt = `## Freelancer Profile\n${userContextStr}\n\n## Jobs to Score\n\n${batch
          .map(
            (j, idx) =>
              `### Job ${idx + 1} (id: ${j.id})\n**Title:** ${j.title}\n**Skills:** ${j.skills.join(", ")}\n**Budget:** ${j.budget_type === "hourly" ? `$${j.hourly_min ?? "?"}–${j.hourly_max ?? "?"}/hr` : j.budget_type === "fixed" ? `Fixed $${j.fixed_budget_min ?? "?"}–${j.fixed_budget_max ?? "?"}` : "Not specified"}\n**Client:** Rating ${j.client_rating ?? "N/A"}, ${j.client_hires ?? 0} hires, Payment ${j.client_payment_verified ? "verified" : "unverified"}\n**Description:**\n${j.description.slice(0, 1500)}`,
          )
          .join("\n\n---\n\n")}`

        try {
          const result = await callChatStructured<{
            jobs: {
              id: string
              score: number
              breakdown: {
                skill_match: number
                budget_fit: number
                client_quality: number
                scope_fit: number
                win_probability: number
              }
              reasoning: string
            }[]
          }>(RANK_SYSTEM_PROMPT, prompt, RANK_JSON_SCHEMA)

          // Insert rankings into job_rankings table
          for (const ranked of result.jobs) {
            await supabasePost("job_rankings", {
              team_id: teamId,
              job_id: ranked.id,
              agent_run_id: agentRunId,
              score: ranked.score,
              tightness: 3,
              breakdown: ranked.breakdown,
            })
          }

          rankedCount += result.jobs.length
          logger.info(`Ranked ${rankedCount}/${shortlistedJobs.length} jobs`)
        } catch (err) {
          logger.error(`Rank batch failed`, {
            error: err instanceof Error ? err.message : "Unknown",
          })
        }
      }

      // ── Step 7: Finalize ────────────────────────────────────────────────

      logger.info("Step 7: Finalizing enrichment run")

      await updateAgentRun(agentRunId, {
        status: "succeeded",
        outputs: {
          jobs_embedded: embeddedCount,
          jobs_shortlisted: matches.length,
          jobs_enriched: enrichedCount,
          jobs_ranked: rankedCount,
        },
        finished_at: new Date().toISOString(),
      })

      logger.info("Enrichment complete", {
        embedded: embeddedCount,
        shortlisted: matches.length,
        enriched: enrichedCount,
        ranked: rankedCount,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      logger.error("Job enrichment failed", { error: errorMessage })

      await updateAgentRun(agentRunId, {
        status: "failed",
        error_text: errorMessage,
        finished_at: new Date().toISOString(),
      })
    }
  },
})
