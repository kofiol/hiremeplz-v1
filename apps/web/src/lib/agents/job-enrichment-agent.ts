import "server-only"
import { Agent, run } from "@openai/agents"
import OpenAI from "openai"
import { z } from "zod"

// ============================================================================
// Types
// ============================================================================

const EnrichedJobSchema = z.object({
  id: z.string(),
  ai_seniority: z.enum(["junior", "mid", "senior"]),
  ai_summary: z.string(),
  description_md: z.string(),
})

const EnrichBatchOutputSchema = z.object({
  jobs: z.array(EnrichedJobSchema),
})

export type EnrichedJob = z.infer<typeof EnrichedJobSchema>

const RankedJobSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(100),
  breakdown: z.object({
    skill_match: z.number().min(0).max(100),
    budget_fit: z.number().min(0).max(100),
    client_quality: z.number().min(0).max(100),
    scope_fit: z.number().min(0).max(100),
    win_probability: z.number().min(0).max(100),
  }),
  reasoning: z.string(),
})

const RankBatchOutputSchema = z.object({
  jobs: z.array(RankedJobSchema),
})

export type RankedJob = z.infer<typeof RankedJobSchema>

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
// Public API
// ============================================================================

export async function enrichJobsBatch(
  jobs: { id: string; title: string; description: string }[],
): Promise<EnrichedJob[]> {
  const prompt = `Enrich the following ${jobs.length} job(s):\n\n${jobs
    .map(
      (j, i) =>
        `### Job ${i + 1} (id: ${j.id})\n**Title:** ${j.title}\n**Description:**\n${j.description}`,
    )
    .join("\n\n---\n\n")}`

  const agent = new Agent({
    name: "Job Enrichment Agent",
    model: "gpt-4.1-mini",
    instructions: ENRICH_SYSTEM_PROMPT,
    outputType: EnrichBatchOutputSchema,
  })

  const result = await run(agent, prompt)
  const output = result.finalOutput as z.infer<typeof EnrichBatchOutputSchema>
  return output.jobs
}

export async function rankJobsBatch(
  jobs: { id: string; title: string; description: string; skills: string[] }[],
  userContext: string,
): Promise<RankedJob[]> {
  const prompt = `## Freelancer Profile\n${userContext}\n\n## Jobs to Score\n\n${jobs
    .map(
      (j, i) =>
        `### Job ${i + 1} (id: ${j.id})\n**Title:** ${j.title}\n**Skills:** ${j.skills.join(", ")}\n**Description:**\n${j.description}`,
    )
    .join("\n\n---\n\n")}`

  const agent = new Agent({
    name: "Job Ranking Agent",
    model: "gpt-4.1-mini",
    instructions: RANK_SYSTEM_PROMPT,
    outputType: RankBatchOutputSchema,
  })

  const result = await run(agent, prompt)
  const output = result.finalOutput as z.infer<typeof RankBatchOutputSchema>
  return output.jobs
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = new OpenAI()
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  })
  return response.data.map((d) => d.embedding)
}
