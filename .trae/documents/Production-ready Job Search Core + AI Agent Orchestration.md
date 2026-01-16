## Current State (What Already Exists)
- A job-search Trigger.dev task exists: [job_search.run.ts](file:///c:/Users/psyhik1769/hiremeplz-monorepo/packages/trigger/job_search.run.ts#L1-L113) creates/updates `agent_runs`, builds LinkedIn query plans, fetches Bright Data, normalizes/dedupes, scores, and writes jobs/rankings.
- A Job Source Router package exists: [job-source-router](file:///c:/Users/psyhik1769/hiremeplz-monorepo/packages/job-source-router/src/index.ts) with [types.ts](file:///c:/Users/psyhik1769/hiremeplz-monorepo/packages/job-source-router/src/types.ts) and [router.ts](file:///c:/Users/psyhik1769/hiremeplz-monorepo/packages/job-source-router/src/router.ts).
- Core domain modules exist (query planning, mapping, ranking) in [workflow-job-search](file:///c:/Users/psyhik1769/hiremeplz-monorepo/packages/workflows/job_search/src/index.ts).
- Tests exist (Vitest) for adapter, query plan builder, mapper, ranking, plus a mocked e2e core test.

## Key Gaps vs Your Required Spec
- Bright Data usage currently uses direct HTTP `fetch` to Bright Data endpoints; you require the Bright Data SDK (`bdclient` from `@brightdata/sdk`) and dataset/snapshot polling patterns.
- RawJob / QueryPlan types don’t match the required provider-agnostic spec (missing `meta.platform_confidence`, optionality differences, missing RouterResponseMeta).
- No OpenAI Agents SDK orchestration exists; current workflow is deterministic and does not run a managed Agent runner with typed tools.
- No shared pg transaction helper (`packages/db/transaction.ts`); no `pg` dependency in repo.
- Current “workflow package” (`packages/workflows/job_search`) is domain-only; Trigger.dev workflow lives in `packages/trigger`, not in the requested `packages/workflows/job_search` module boundary.
- Integration test does not exercise DB writes (`job_sources`, `jobs`, `job_rankings`) nor `agent_runs` lifecycle end-to-end.

## Target Architecture (Aligned to Deliverables)
- Keep domain logic pure and testable:
  - `packages/job-source-router`: provider adapters + router abstraction.
  - `packages/query-plan-builder`: profile/preferences → QueryPlan[] (3–10).
  - `packages/mapping-ranking`: normalize_job + score_job with Zod schemas.
  - `packages/db`: pg transaction helper and prepared/parameterized SQL.
  - `packages/workflows/job_search`: orchestration logic + OpenAI Agents SDK runner + typed tool contracts.
  - `packages/trigger`: minimal Trigger.dev entrypoint that calls `@repo/workflows-job-search` (or equivalent) so Trigger remains configured in [trigger.config.ts](file:///c:/Users/psyhik1769/hiremeplz-monorepo/trigger.config.ts#L1-L22).

## Implementation Plan (Work Items)
### A) packages/job-source-router
- Update/extend [types.ts](file:///c:/Users/psyhik1769/hiremeplz-monorepo/packages/job-source-router/src/types.ts) to match your required `RawJob`, `QueryPlan`, `RouterResponseMeta` shapes.
- Add `brightdata/linkedin-adapter.ts` exporting `BrightDataLinkedInAdapter` implementing `JobSourceRouter`.
  - Implement via `@brightdata/sdk` (`bdclient`) with dataset methods + snapshot polling/download (no raw HTTP).
  - Add retry/backoff (exp + jitter) configurable via constructor.
  - Normalize results to `RawJob[]` and compute per-result `meta.platform_confidence`.
- Preserve backward compatibility by re-exporting from old paths (so existing imports continue to work).
- Update unit tests to stub/mimic `bdclient` methods instead of stubbing `fetch`.

### B) packages/query-plan-builder
- Create new package and implement `buildQueryPlan(profileSnapshot, userPreferences): QueryPlan[]`.
  - Deterministic generation producing 3–10 plans (platform hints, keywords, location, filters, paging strategy).
  - Optional synonym expansion hook (off by default).
- Add unit tests with multiple profile fixtures and pagination shape assertions.

### C) packages/mapping-ranking
- Create `normalize_job(raw, team_id): NormalizedJob`:
  - Normalize to `public.jobs` column shape and compute deterministic `canonical_hash` (SHA256 of `platform|platform_job_id|title|company|location` as requested).
  - Use Zod schemas for `NormalizedJob` and tool I/O contracts.
  - Ensure no DB writes in mapper.
- Create `score_job(job, profile, prefs, tightness): { score, breakdown }`:
  - Implement scoring components (0–30/20/10/15/10/10/-25) and clamp to [0,100].
  - Ensure breakdown keys and `notes` array always exist.
  - Implement tightness thresholds + exploration allowances per your table.
- Add edge-case tests (missing budget, partial skills, fraud patterns, old posts, clamps).

### D) packages/workflows/job_search (Trigger.dev workflow + OpenAI Agent)
- Add OpenAI Agents SDK runner using `@openai/agents` with typed tools (Zod) per your list:
  - `job_source_router.search(plan)`
  - `normalize_job(raw)`
  - `dedupe_jobs(canonical[])`
  - `score_job(job, profile, prefs, tightness)`
  - `write_jobs_and_rankings(team_id, jobs[], rankings[])`
- Encode the provided agent prompt verbatim (mission + guardrails + output constraints).
- Ensure runner defaults `maxTurns = 10` and tracing metadata includes `team_id`, `user_id`, `agent_run_id`.
- Workflow lifecycle:
  - Create `agent_runs` queued → running → succeeded/failed with `started_at`/`finished_at`.
  - After agent completes: normalize → dedupe by `canonical_hash` → write `job_sources`, `jobs`, `job_rankings` (write every job).
- Idempotency:
  - Use `agent_runs` idempotency key and DB unique constraints (`unique(team_id, canonical_hash)` etc.) with upserts.
  - Implement robust error capture to `agent_runs.error_text` including last successful step.

### E) Supabase + Transactions
- Continue using `@supabase/supabase-js` (service role key) for reads/simple writes.
- Add `packages/db/transaction.ts` using `pg` + `DATABASE_URL` for multi-table atomic commit (parameterized queries).
- Prefer calling the existing RPC (`public.upsert_jobs_and_rankings`) where appropriate, but ensure it meets “write every job_sources + jobs + rankings” requirement; otherwise implement explicit transaction.
- Fix the migration issue at the end of [20260114120000_canonical_schema.sql](file:///c:/Users/psyhik1769/hiremeplz-monorepo/supabase/migrations/20260114120000_canonical_schema.sql#L364) (stray token) so migrations apply cleanly.

### F) Tests & Local Dev
- Keep Vitest across packages.
- Add Bright Data SDK fixtures: `tests/fixtures/brightdata_linkedin_sample.jsonl`.
- Add an integration test that runs the full `job_search.run` orchestration (agent tools + mocked BrightData SDK + DB writes) and asserts:
  - `agent_runs` lifecycle
  - rows in `job_sources`, `jobs`, `job_rankings` with breakdown correctness
- Choose pg-mem for CI simplicity, applying SQL migrations from `supabase/migrations`.

### G) CI / Scripts
- Add per-package scripts: `test`, `test:unit`, `test:integration`, `lint`, `build`.
- Add GitHub Actions workflow example (`.github/workflows/ci.yml`): install Node (use 22 so `@openai/agents` is supported per docs), run lint/build/tests, run integration with mocked BrightData.

### H) .env.example
- Add a root `.env.example` containing the vars you listed (no secrets).
- Document secret handling (no committed keys).

### I) Documentation
- Add README.md to each new/updated package describing purpose, exports, example usage, testing, idempotency, retries, security.
- Add a top-level “Job Search” README describing how to run Trigger.dev locally and how the agent behaves.

## Compatibility / Dependency Notes
- `@openai/agents` documentation lists Node.js 22+ as the supported runtime; CI and Trigger worker runtime will be aligned to Node 22 to satisfy this requirement. (Your “Node 18+” constraint is still satisfied because 22 is within 18+.)

## Acceptance Checklist Mapping
- Each acceptance bullet maps directly to one of the sections A–I above; I’ll validate by running unit tests + one full integration test and ensuring DB writes and agent_run lifecycle assertions pass.
