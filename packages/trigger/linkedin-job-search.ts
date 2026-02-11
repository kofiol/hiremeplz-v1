/**
 * LinkedIn Job Search Task
 *
 * A trigger.dev task that searches LinkedIn for jobs using BrightData,
 * normalizes results, and upserts them into Supabase.
 *
 * Mirrors linkedin-profile-scraper.ts structure.
 */

import { logger, schemaTask, tasks, wait } from "@trigger.dev/sdk/v3"
import { z } from "zod"
import { normalizeLinkedInJobs, type RawLinkedInJob } from "./job-normalizer"

// ============================================================================
// Constants
// ============================================================================

const BRIGHTDATA_DATASET_ID = "gd_lpfll7v5hcqtkxl6l"
const BRIGHTDATA_API_BASE = "https://api.brightdata.com/datasets/v3"
const MAX_POLL_ATTEMPTS = 60

/**
 * BrightData requires 2-letter ISO 3166-1 alpha-2 codes.
 * This map catches common full-name outputs from the AI agent.
 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  "united kingdom": "GB",
  "canada": "CA",
  "australia": "AU",
  "germany": "DE",
  "france": "FR",
  "israel": "IL",
  "india": "IN",
  "netherlands": "NL",
  "spain": "ES",
  "italy": "IT",
  "brazil": "BR",
  "japan": "JP",
  "singapore": "SG",
  "sweden": "SE",
  "switzerland": "CH",
  "ireland": "IE",
  "new zealand": "NZ",
  "portugal": "PT",
  "poland": "PL",
  "south korea": "KR",
  "mexico": "MX",
  "argentina": "AR",
  "united arab emirates": "AE",
  "south africa": "ZA",
}

function normalizeCountryCode(country: string): string {
  // Already a 2-letter code
  if (/^[A-Z]{2}$/.test(country)) return country
  // Try lookup by full name
  const code = COUNTRY_NAME_TO_CODE[country.toLowerCase()]
  if (code) return code
  // Last resort: take first 2 chars uppercased (better than nothing)
  logger.warn(`Unknown country "${country}", falling back to US`)
  return "US"
}

/**
 * Progressive polling intervals — same pattern as profile scraper.
 */
function getPollInterval(attemptNumber: number): number {
  if (attemptNumber <= 5) return 2
  if (attemptNumber <= 15) return 5
  return 10
}

// ============================================================================
// Input/Output Schemas
// ============================================================================

const JobSearchQuerySchema = z.object({
  keyword: z.string(),
  location: z.string(),
  country: z.string(),
  time_range: z.string(),
})

const JobSearchInputSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  agentRunId: z.string().uuid(),
  queries: z.array(JobSearchQuerySchema).min(1).max(3),
})

const TaskOutputSchema = z.object({
  success: z.boolean(),
  jobsFetched: z.number(),
  jobsNew: z.number(),
  jobsSkipped: z.number(),
  snapshotIds: z.array(z.string()),
  error: z.string().nullable(),
})

export type JobSearchInput = z.infer<typeof JobSearchInputSchema>
export type JobSearchOutput = z.infer<typeof TaskOutputSchema>

// ============================================================================
// BrightData API Helpers
// ============================================================================

async function triggerJobSearch(
  query: { keyword: string; location: string; country: string; time_range: string },
  apiKey: string,
): Promise<string> {
  const input = {
    input: [
      {
        keyword: query.keyword,
        location: query.location,
        country: normalizeCountryCode(query.country),
        time_range: query.time_range,
      },
    ],
  }

  const response = await fetch(
    `${BRIGHTDATA_API_BASE}/trigger?dataset_id=${BRIGHTDATA_DATASET_ID}&type=discover_new&discover_by=keyword&include_errors=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`BrightData trigger failed: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  logger.info("BrightData trigger response", { data })

  const snapshotId =
    (data.snapshot_id as string) ||
    (data.snapshotId as string) ||
    (data.id as string) ||
    (data.snapshot as string)

  if (!snapshotId) {
    throw new Error(`BrightData returned unexpected response format: ${JSON.stringify(data)}`)
  }

  return snapshotId
}

async function checkProgress(
  snapshotId: string,
  apiKey: string,
): Promise<{ status: "running" | "ready" | "failed"; error?: string }> {
  const response = await fetch(`${BRIGHTDATA_API_BASE}/progress/${snapshotId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    logger.warn(`Progress check failed: ${response.status}`)
    return { status: "running" }
  }

  const data = (await response.json()) as Record<string, unknown>
  logger.info("BrightData progress response", { data })

  const status = data.status as string
  if (status === "ready" || status === "completed") {
    return { status: "ready" }
  }
  if (status === "failed" || status === "error") {
    return { status: "failed", error: (data.error as string) || "Unknown error" }
  }
  return { status: "running" }
}

async function fetchSnapshot(
  snapshotId: string,
  apiKey: string,
): Promise<{ status: "running" | "ready"; data?: RawLinkedInJob[] }> {
  const progress = await checkProgress(snapshotId, apiKey)
  if (progress.status === "running") {
    return { status: "running" }
  }
  if (progress.status === "failed") {
    throw new Error(`BrightData scrape failed: ${progress.error}`)
  }

  const response = await fetch(`${BRIGHTDATA_API_BASE}/snapshot/${snapshotId}?format=json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (response.status === 202) {
    return { status: "running" }
  }

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("Snapshot fetch failed", { status: response.status, error: errorText })
    throw new Error(`BrightData snapshot fetch failed: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as RawLinkedInJob[]
  logger.info(`Snapshot fetched successfully with ${data.length} job(s)`)
  return { status: "ready", data }
}

async function pollForResults(
  snapshotId: string,
  apiKey: string,
): Promise<RawLinkedInJob[]> {
  let attempts = 0

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++
    const interval = getPollInterval(attempts)
    logger.info(
      `Polling for results (attempt ${attempts}/${MAX_POLL_ATTEMPTS}, next check in ${interval}s)...`,
    )

    const result = await fetchSnapshot(snapshotId, apiKey)
    if (result.status === "ready" && result.data) {
      logger.info(`Received ${result.data.length} job(s) after ${attempts} attempts`)
      return result.data
    }

    await wait.for({ seconds: interval })
  }

  return []
}

// ============================================================================
// Supabase Helpers (PostgREST via fetch — no SDK dependency)
// ============================================================================

function getSupabaseConfig() {
  // Prefer the public cloud URL over SUPABASE_URL which may point to localhost
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return { url, serviceRoleKey }
}

async function upsertJobsViaRpc(
  teamId: string,
  agentRunId: string,
  jobs: ReturnType<typeof normalizeLinkedInJobs>,
) {
  const { url, serviceRoleKey } = getSupabaseConfig()

  const body = {
    p_team_id: teamId,
    p_agent_run_id: agentRunId,
    p_job_sources: jobs.sources,
    p_jobs: jobs.jobs,
    p_rankings: [],
  }

  const response = await fetch(`${url}/rest/v1/rpc/upsert_jobs_and_rankings`, {
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
    const errorText = await response.text()
    throw new Error(`upsert_jobs_and_rankings RPC failed: ${response.status} - ${errorText}`)
  }

  const result = (await response.json()) as { jobs_upserted: number; rankings_written: number }
  logger.info("Upsert result", { result })
  return result
}

async function createAgentRun(
  teamId: string,
  userId: string,
  agentType: string,
): Promise<{ id: string } | null> {
  const { url, serviceRoleKey } = getSupabaseConfig()

  const response = await fetch(`${url}/rest/v1/agent_runs`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      team_id: teamId,
      user_id: userId,
      agent_type: agentType,
      status: "queued",
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("Failed to create agent_runs", { status: response.status, error: errorText })
    return null
  }

  const data = (await response.json()) as { id: string }[]
  return data[0] ?? null
}

async function updateAgentRun(
  agentRunId: string,
  update: Record<string, unknown>,
) {
  const { url, serviceRoleKey } = getSupabaseConfig()

  const response = await fetch(`${url}/rest/v1/agent_runs?id=eq.${agentRunId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(update),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("Failed to update agent_runs", { status: response.status, error: errorText })
  }
}

// ============================================================================
// The Task
// ============================================================================

export const searchLinkedInJobs = schemaTask({
  id: "linkedin-job-search",
  schema: JobSearchInputSchema,

  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },

  maxDuration: 600,

  run: async (payload) => {
    const apiKey = process.env.BRIGHTDATA_API_KEY
    if (!apiKey) {
      logger.error("BRIGHTDATA_API_KEY not configured")
      await updateAgentRun(payload.agentRunId, {
        status: "failed",
        error_text: "BRIGHTDATA_API_KEY not configured",
        finished_at: new Date().toISOString(),
      })
      return {
        success: false,
        jobsFetched: 0,
        jobsNew: 0,
        jobsSkipped: 0,
        snapshotIds: [],
        error: "BRIGHTDATA_API_KEY environment variable is not set",
      } satisfies JobSearchOutput
    }

    const { teamId, agentRunId, queries } = payload
    const snapshotIds: string[] = []
    const allRawJobs: RawLinkedInJob[] = []

    try {
      // Process queries sequentially to avoid BrightData rate limits
      for (const query of queries) {
        logger.info(`Triggering search for: "${query.keyword}" in ${query.location}`)

        const snapshotId = await triggerJobSearch(query, apiKey)
        snapshotIds.push(snapshotId)
        logger.info(`Snapshot created: ${snapshotId}`)

        const rawJobs = await pollForResults(snapshotId, apiKey)
        if (rawJobs.length > 0) {
          allRawJobs.push(...rawJobs)
          logger.info(`Got ${rawJobs.length} jobs from query "${query.keyword}"`)
        } else {
          logger.warn(`No results for query "${query.keyword}"`)
        }
      }

      if (allRawJobs.length === 0) {
        await updateAgentRun(agentRunId, {
          status: "succeeded",
          outputs: { jobs_fetched: 0, jobs_new: 0, jobs_skipped: 0 },
          finished_at: new Date().toISOString(),
        })
        return {
          success: true,
          jobsFetched: 0,
          jobsNew: 0,
          jobsSkipped: 0,
          snapshotIds,
          error: null,
        } satisfies JobSearchOutput
      }

      // Normalize all collected raw jobs
      const normalized = normalizeLinkedInJobs(allRawJobs, teamId)
      logger.info(
        `Normalized ${normalized.jobs.length} jobs, skipped ${normalized.skipped}`,
      )

      // Upsert to Supabase
      const upsertResult = await upsertJobsViaRpc(teamId, agentRunId, normalized)

      const output = {
        jobs_fetched: allRawJobs.length,
        jobs_new: upsertResult.jobs_upserted,
        jobs_skipped: normalized.skipped,
        snapshot_ids: snapshotIds,
      }

      await updateAgentRun(agentRunId, {
        status: "succeeded",
        outputs: output,
        finished_at: new Date().toISOString(),
      })

      // Chain enrichment task if we got new jobs
      if (upsertResult.jobs_upserted > 0) {
        try {
          // Create a new agent_runs record for enrichment
          const enrichRunResult = await createAgentRun(teamId, payload.userId, "job_enrichment")
          if (enrichRunResult) {
            await tasks.trigger("job-enrichment", {
              teamId,
              userId: payload.userId,
              agentRunId: enrichRunResult.id,
            })
            logger.info(`Chained job-enrichment task with run ${enrichRunResult.id}`)
          }
        } catch (chainError) {
          logger.error("Failed to chain enrichment task", {
            error: chainError instanceof Error ? chainError.message : "Unknown",
          })
        }
      }

      return {
        success: true,
        jobsFetched: allRawJobs.length,
        jobsNew: upsertResult.jobs_upserted,
        jobsSkipped: normalized.skipped,
        snapshotIds,
        error: null,
      } satisfies JobSearchOutput
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      logger.error("Job search failed", { error: errorMessage })

      await updateAgentRun(agentRunId, {
        status: "failed",
        error_text: errorMessage,
        finished_at: new Date().toISOString(),
      })

      return {
        success: false,
        jobsFetched: allRawJobs.length,
        jobsNew: 0,
        jobsSkipped: 0,
        snapshotIds,
        error: errorMessage,
      } satisfies JobSearchOutput
    }
  },
})
