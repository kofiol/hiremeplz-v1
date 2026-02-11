# Job Ingestion Architecture v2

**Status:** Ready to build
**Date:** 2026-02-11
**Scope:** Per-user job pool with AI-powered query generation

---

## Overview

Each user gets a personalized job pool. When triggered, an AI agent reads the user's profile and generates optimal BrightData search queries. Results are scraped, normalized, deduplicated, and stored scoped to the user's team.

```
User Profile (skills, location, headline, preferences)
      ↓
AI Query Builder Agent (gpt-4.1-mini, structured output)
      ↓
BrightData LinkedIn Jobs API (1-3 searches per run)
      ↓
Normalizer (raw → canonical schema + dedup)
      ↓
Supabase (jobs + job_sources + agent_runs, all team-scoped)
```

---

## Components

### 1. AI Query Builder Agent

**File:** `apps/web/src/lib/agents/job-query-agent.ts`

An OpenAI agent that takes the user's full profile context and outputs optimal BrightData search inputs. Uses structured output (Zod schema) — same pattern as `analysis-agent.ts`.

**Model:** gpt-4.1-mini

**Input context (injected into prompt):**
- Display name, headline, about
- Skills (name + level + years)
- Experiences (title, company, highlights)
- Preferences (platforms, hourly rate range, currency, tightness, project types)
- Location + country code

**Output schema:**
```typescript
z.object({
  queries: z.array(z.object({
    keyword: z.string(),         // e.g. "React TypeScript senior developer"
    location: z.string(),        // e.g. "Austin"
    country: z.string(),         // e.g. "US"
    time_range: z.enum(["Past 24 hours", "Past week", "Past month"]),
  })).min(1).max(3),
  reasoning: z.string(),         // Why these queries were chosen
})
```

**System prompt directives:**
- Generate 1-3 search queries that maximize relevant job coverage
- First query: core skills + primary role (highest signal)
- Second query: adjacent/complementary skills or alternate job title
- Third query (optional): broader industry term or niche specialization
- Use the user's actual location. If remote-only, use their country's major tech hub
- Keywords should be 3-6 words, not full sentences
- Match keyword style to what recruiters post on LinkedIn (job titles, not skill lists)
- Tightness 1-2: broader keywords, more general titles
- Tightness 4-5: exact skill combos, specific seniority
- Always use "Past week" unless user has very niche skills (then "Past month")

**Why AI here:** Hand-coding query logic means maintaining keyword mapping, synonym handling, seniority inference, location normalization — all things an LLM does natively. One prompt replaces hundreds of lines of brittle heuristics. The cost is negligible (~200 input tokens, ~100 output tokens, <$0.001 per call).

---

### 2. trigger.dev Task: LinkedIn Job Search

**File:** `packages/trigger/linkedin-job-search.ts`

Mirrors `linkedin-profile-scraper.ts` structure exactly. Receives pre-built queries from the API route (not the raw profile — the AI agent runs in the API route, not in trigger.dev).

**Input schema:**
```typescript
z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  queries: z.array(z.object({
    keyword: z.string(),
    location: z.string(),
    country: z.string(),
    time_range: z.string(),
  })).min(1).max(3),
})
```

**Flow:**
1. For each query, trigger a BrightData snapshot (sequential, not parallel — avoid rate limits)
2. Poll each snapshot with progressive intervals (2s→5s→10s, max 60 attempts)
3. Collect all raw results into a single array
4. Normalize all raw jobs → canonical schema (via `job-normalizer.ts`)
5. Deduplicate by `canonical_hash` across all queries
6. Batch upsert to `jobs` table (ON CONFLICT canonical_hash → update)
7. Insert raw data to `job_sources` table
8. Return `{ success, jobsFetched, jobsNew, jobsSkipped, snapshotIds }`

**Config:**
- Dataset ID: `gd_lpfll7v5hcqtkxl6l`
- Retry: 3 attempts, exponential backoff (2s→30s)
- Max duration: 600s (10 min)
- Progressive polling: 2s (attempts 1-5) → 5s (6-15) → 10s (16+)

---

### 3. Job Normalizer

**File:** `packages/trigger/job-normalizer.ts`

Ported from `playground/raw-job-object-normalizer/route.ts`. Pure function, no side effects.

**Signature:**
```typescript
function normalizeLinkedInJobs(
  rawJobs: RawLinkedInJob[],
  teamId: string,
): { jobs: CanonicalJob[], sources: JobSource[], skipped: number }
```

**What it does:**
- Maps LinkedIn raw fields → canonical `jobs` table schema
- Generates `canonical_hash` = SHA256(platform + platform_job_id + team_id)
- Extracts skills from title + description (keyword matching)
- Validates required fields (title, platform_job_id, apply_url)
- Preserves raw JSON in `job_sources` for audit/reprocessing
- Deduplicates within the batch by canonical_hash

**Changes from playground version:**
- Remove CLI/CSV logic — just export the pure normalize function
- Accept `team_id` parameter (per-user scoping)
- Return structured output (jobs array + sources array + skip count)
- Export types (`RawLinkedInJob`, `CanonicalJob`, `JobSource`)

---

### 4. API Routes

#### `POST /api/v1/jobs/fetch`

**File:** `apps/web/src/app/api/v1/jobs/fetch/route.ts`

Orchestrates the full flow: auth → fetch profile → AI query builder → trigger task → record run.

**Flow:**
1. `verifyAuth(authHeader)` → `{ userId, teamId }`
2. Rate limit check (max 5 fetches per hour per user)
3. Fetch user profile context from DB (profile, skills, experiences, preferences) — reuse `fetchUserContext()` pattern from overview chat route
4. Call AI query builder agent → get `{ queries, reasoning }`
5. Trigger `linkedin-job-search` task via `tasks.trigger()`
6. Insert `agent_runs` record: `{ agent_type: "job_search", trigger: "manual", status: "queued", inputs: { queries, reasoning } }`
7. Return `{ runId, queries, reasoning }`

**Response:** `{ runId: string, queries: Query[], reasoning: string }`

#### `GET /api/v1/jobs/fetch/status`

**File:** `apps/web/src/app/api/v1/jobs/fetch/status/route.ts`

Polls the latest job fetch run status for the user.

**Flow:**
1. `verifyAuth(authHeader)` → `{ userId, teamId }`
2. Query `agent_runs` for latest `job_search` run for this team
3. Return status + outputs if complete

**Response:** `{ status: "queued" | "running" | "succeeded" | "failed", outputs?: { jobsFetched, jobsNew, jobsSkipped }, error?: string, startedAt, finishedAt }`

---

### 5. Database Changes

#### New: `job_bookmarks` table

```sql
CREATE TABLE job_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id, job_id)
);

CREATE INDEX idx_job_bookmarks_team_user ON job_bookmarks(team_id, user_id);
```

#### New indexes on `jobs` (if not already present):

```sql
CREATE INDEX IF NOT EXISTS idx_jobs_team_posted ON jobs(team_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_hash ON jobs(canonical_hash);
```

#### RLS policy for `job_bookmarks`:

```sql
ALTER TABLE job_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can manage bookmarks"
  ON job_bookmarks FOR ALL
  USING (is_team_member(team_id));
```

---

### 6. File Map

```
NEW FILES:
  apps/web/src/lib/agents/job-query-agent.ts        → AI query builder
  apps/web/src/app/api/v1/jobs/fetch/route.ts        → POST trigger
  apps/web/src/app/api/v1/jobs/fetch/status/route.ts → GET poll status
  packages/trigger/linkedin-job-search.ts            → trigger.dev task
  packages/trigger/job-normalizer.ts                 → normalizer (ported)
  supabase/migrations/YYYYMMDD_job_bookmarks.sql     → bookmarks table

EXISTING FILES TO MODIFY:
  apps/web/src/lib/rate-limit.server.ts              → add jobFetch rate limit
  apps/web/src/lib/database.types.ts                 → add job_bookmarks types (after migration)
```

---

### 7. Trigger Points

**Now:**
- Manual: user clicks "Fetch new jobs" on /jobs page → `POST /api/v1/jobs/fetch`

**After onboarding (wire up later):**
- Auto: onboarding completion triggers first job fetch

**Future (not building now):**
- Scheduled: trigger.dev cron based on user's tightness preference
- Profile change: re-fetch when skills/preferences update

---

### 8. Cost Estimate

Per user, per fetch:
- AI query builder: ~300 tokens → ~$0.001
- BrightData: 1-3 snapshots × ~50-200 records each → $0.25-$1.50
- Total per fetch: **~$0.25-$1.50**

At 1 fetch/day per user, 100 users = ~$25-$150/day.

---

### 9. Build Order

1. `job-normalizer.ts` — port from playground, pure function, easy to test
2. `linkedin-job-search.ts` — trigger.dev task, mirrors profile scraper
3. `job-query-agent.ts` — AI agent with structured output
4. `POST /api/v1/jobs/fetch` — orchestration route
5. `GET /api/v1/jobs/fetch/status` — status polling route
6. Migration: `job_bookmarks` table
7. Rate limit config addition
