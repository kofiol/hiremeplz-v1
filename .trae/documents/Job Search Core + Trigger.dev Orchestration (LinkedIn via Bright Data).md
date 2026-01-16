## What I Researched (Repo + Specs + Vendor APIs)
- Supabase canonical schema + run status enums (`agent_runs.status` is `queued|running|succeeded|failed|canceled`) and canonical job fields + ranking breakdown keys.
- Existing Next.js trigger endpoint currently calls Trigger task `hello-world`.
- Trigger.dev SDK in repo is v4.x and supports idempotency keys.
- Bright Data Web Scraper API supports `/datasets/v3/scrape` (sync) and `/datasets/v3/trigger` (async with `snapshot_id`), plus `/datasets/v3/progress/{snapshot_id}` for polling.
- Bright Data LinkedIn Jobs example shows dataset_id `gd_lpfll7v5hcqtkxl6l` for “collect by job URL”; keyword discovery is supported by the LinkedIn suite docs.

## Architecture Decisions
- Keep scraping concerns isolated in `packages/job-source-router` (provider-agnostic `RawJob` and `QueryPlan`).
- Put “Job Search Core” domain logic (plan → fetch → map → rank → write) in `packages/workflows/job_search`.
- Keep Trigger.dev task entrypoint in `packages/trigger` (because `trigger.config.ts` only loads that directory), and import the core workflow module from `packages/workflows/job_search`.
- Use Zod for runtime validation + type inference for Supabase row shapes and Bright Data payloads.

## 1) packages/job-source-router
### 1.1 Types
- Implement `RawJob` as a provider-agnostic shape that can represent LinkedIn results reliably.
- Implement `QueryPlan` with:
  - query: `keyword`, `location`, `country`, `remote`, `experience_level`, `time_range`, `job_type`, `company`, `page/limit`.
  - strategy: `mode: "keyword" | "search_url" | "job_url"` so the adapter can choose the right Bright Data dataset.

### 1.2 Router Interface
- Export `interface JobSourceRouter { search(plan: QueryPlan): Promise<RawJob[]> }`.

### 1.3 BrightDataLinkedInAdapter
- Implement adapter that:
  - Builds Bright Data requests to `/datasets/v3/trigger` with `Authorization: Bearer <apiKey>`.
  - Uses dataset IDs from env:
    - `BRIGHTDATA_LINKEDIN_JOBS_DISCOVER_DATASET_ID` (keyword/search URL discovery)
    - `BRIGHTDATA_LINKEDIN_JOBS_DETAILS_DATASET_ID` (job URL details; default to `gd_lpfll7v5hcqtkxl6l` if set)
  - Polls `/datasets/v3/progress/{snapshot_id}` until `ready|failed`, then downloads snapshot data.
  - Implements rate-limit handling (429 + Retry-After), exponential backoff with jitter, and a bounded concurrency limiter.
  - Normalizes Bright Data results into `RawJob[]`:
    - Always populate `platform`, `platform_job_id` (best effort), `title`, `description` (or empty with low confidence), `apply_url`, `posted_at` (best effort), `skills` (if present), `seniority`.
    - Set `source_raw` as the original record.

### Tests
- Unit tests for:
  - Request construction (query params + body for keyword/search_url/job_url modes).
  - Retry behavior (429/5xx).
  - Parsing/normalization from fixture JSON (including partial/malformed records).

## 2) Query Plan Builder (in packages/workflows/job_search)
- Create a pure function that takes:
  - user skills + experiences + preferences + target titles/keywords
  - returns one or more LinkedIn `QueryPlan`s (e.g., primary keywords + exploration variants).
- Tests:
  - Stable output given profile inputs.
  - Coverage of edge cases: missing preferences, empty skills, multiple preferred titles.

## 3) Mapping & Ranking (in packages/workflows/job_search)
### 3.1 Mapper
- Map `RawJob[]` → canonical `jobs` insert/upsert shapes matching the spec:
  - Compute `canonical_hash` exactly as defined: sha256(team_id + platform + platform_job_id) with fallback hash when platform_job_id missing.
  - Populate required fields, default currency, normalize skills, normalize seniority.
  - Do not write to DB here.

### 3.2 Ranking
- Implement scoring per spec:
  - Weighted sum: skill_match (0–30), budget_fit (0–20), seniority_fit (0–10), client_quality (0–15), recency (0–10), platform_confidence (0–10), fraud_penalty (0..-25).
  - Tightness thresholds + budget tolerance table.
  - Return `{ score, breakdown, explanation/notes[] }`.
- Tests:
  - Edge cases: missing budgets, missing skills, stale jobs, suspicious apply_url, low-confidence parsing.
  - Tightness behavior: minimum score cutoff and tolerance changes.

## 4) Trigger.dev Workflow — job_search.run (packages/trigger)
- Add task `job_search.run` using `task({ id: "job_search.run", ... })`.
- Flow:
  1. Insert or reuse an `agent_runs` row (status `queued`) and capture `ctx.run.id` in `inputs.trigger_run_id`.
  2. Update to `running`, set `started_at`.
  3. Create `agent_run_steps` rows for each step name and update step status as it completes/fails.
  4. Call: query planner → router → mapper → ranking.
  5. Write to Supabase:
     - `job_sources` upsert (unique team/platform/platform_job_id).
     - `jobs` upsert (unique team/canonical_hash).
     - `job_rankings` insert (scoped to agent_run_id) with cleanup-before-insert for idempotence.
  6. On success: mark `agent_runs.status = succeeded`, set `finished_at`, store stats in `outputs`.
  7. On failure: mark `failed`, set `finished_at`, store `error_text` and partial stats.

### Idempotence + Reschedulable
- Use Trigger.dev idempotency for the API endpoint trigger.
- For DB writes:
  - Upsert on unique keys (`job_sources`, `jobs`).
  - Before inserting rankings: delete existing `job_rankings` for `(team_id, agent_run_id)` then insert fresh.
  - Reuse `agent_runs` row on retries by looking up `agent_runs` where `team_id` matches and `inputs->>'trigger_run_id' = ctx.run.id`.

## 5) Supabase Integration
- Use existing server-side `supabaseAdmin` pattern (service role).
- Add a small `db` layer in `packages/workflows/job_search`:
  - Zod schemas for inserts/outputs (jobs, job_sources, job_rankings, agent_runs).
  - Helpers for batching (chunk inserts), consistent error normalization, and safe JSON serialization.
- Where transactions are needed:
  - Add an optional RPC migration `upsert_jobs_and_rankings(jsonb)` to run the “write” phase atomically (fallback to multi-call mode if RPC is not deployed).

## 6) Tests + Local Dev Environment
- Use Vitest for packages.
- Mock Bright Data via fixture snapshots (and fetch mocking) so tests are deterministic.
- Add local Supabase project support:
  - Create a `supabase/` directory with migrations that include the canonical schema from the product spec.
  - Provide scripts to start/reset and apply migrations.
- CI:
  - Add root `test` script (turbo) and a GitHub Actions workflow that runs `pnpm install`, `pnpm check-types`, `pnpm lint`, `pnpm test`.

## Repo Wiring Changes Needed
- Create new workspaces:
  - `packages/job-source-router` (new package)
  - `packages/workflows/job_search` (new package; currently only stray node_modules artifacts exist)
- Update `apps/web/src/app/api/v1/job-search/trigger/route.ts` to trigger `job_search.run` and include idempotencyKey.
- Keep Trigger.dev discovery under `packages/trigger` (because config uses `dirs: ["./packages/trigger"]`).

## Acceptance Checklist Mapping (Your Required Todo List)
- Job Source Router + `RawJob` contract: delivered in `packages/job-source-router`.
- Router interface executes search: `JobSourceRouter.search(plan)`.
- Bright Data adapter returns `RawJob[]`: `BrightDataLinkedInAdapter`.
- Query plan builder: `packages/workflows/job_search`.
- Mapping to canonical `jobs`: mapper module.
- Ranking 0–100 + explanation: ranking module.
- Rankings written to `job_rankings`: workflow write step.
- Trigger task creates `agent_runs`: first workflow step.
- Status updates queued→running→succeeded/failed: workflow lifecycle.
- Workflow writes ingested jobs and rankings: write step.
- End-to-end dev/test run: integration test + local Trigger.dev dev instructions.

## Environment Variables (Example)
- `BRIGHTDATA_API_KEY`
- `BRIGHTDATA_LINKEDIN_JOBS_DISCOVER_DATASET_ID`
- `BRIGHTDATA_LINKEDIN_JOBS_DETAILS_DATASET_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TRIGGER_SECRET_KEY`

If you confirm this plan, I’ll implement all modules, add tests, wire the Trigger task + API endpoint, and provide the local Supabase migrations + CI config.