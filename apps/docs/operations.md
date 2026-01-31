---
type: spec
title: Operations & Development
status: living-document
updated: 2026-01-31
context_for_agents: >
  Development setup requires Node 18+, pnpm 10.x, and environment
  variables from .env.example. Run pnpm dev for local development.
  Pre-commit checks: pnpm lint, pnpm check-types, pnpm test.
  Supabase local runs on port 54321. Web app on port 3000.
tags: [operations, development, devops]
---

# Operations & Development

## Local Development Setup

### Prerequisites

- Node.js >= 18
- pnpm 10.26.0 (`corepack enable && corepack prepare pnpm@10.26.0 --activate`)
- Supabase CLI (for local database)
- Git

### First-Time Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd hiremeplz-v1
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your keys (see Environment Variables below)

# 3. Start Supabase local (optional - can use cloud Supabase)
supabase start    # Runs on localhost:54321

# 4. Run database migrations
supabase db push  # Or apply via Supabase dashboard

# 5. Start development servers
pnpm dev          # Starts all workspaces via Turbo TUI
```

### Development Servers

| Service | URL | Notes |
|---------|-----|-------|
| Web app | `http://localhost:3000` | Next.js dev server |
| Supabase Studio | `http://localhost:54323` | Database UI (local only) |
| Supabase API | `http://localhost:54321` | Local Supabase API |

### Working on Specific Packages

```bash
cd apps/web && pnpm dev          # Web app only
pnpm turbo run test --filter db  # Test db package only
pnpm turbo run build --filter trigger  # Build trigger package
```

## Pre-Commit Checklist

Run these before every commit:

```bash
pnpm lint          # ESLint (flat config)
pnpm check-types   # TypeScript compiler check
pnpm test          # Vitest test suites
```

## Database Operations

### Viewing Data

Use Supabase Studio (local or cloud dashboard) for visual data browsing. For direct queries:

```bash
# Via Supabase CLI
supabase db query "SELECT count(*) FROM jobs"

# Via psql (requires DATABASE_URL)
psql $DATABASE_URL -c "SELECT count(*) FROM jobs"
```

### Creating Migrations

```bash
# Generate a new migration file
supabase migration new <migration_name>

# Edit the generated file in supabase/migrations/

# Apply to local database
supabase db push

# Apply to production (via dashboard or CI)
```

### Current Migration History

```
20260114120000_canonical_schema.sql      # Full initial schema
20260117150000_jobs_company_logo.sql     # Added company_logo_url
20260117163000_job_rankings_latest.sql   # Rankings update
```

## Observability

### Agent Run Tracking

Every AI agent execution is logged in `agent_runs`:

```sql
-- Recent agent activity
SELECT agent_type, status, trigger,
       started_at, finished_at,
       finished_at - started_at as duration
FROM agent_runs
ORDER BY created_at DESC
LIMIT 20;

-- Failed runs with errors
SELECT agent_type, error_text, created_at
FROM agent_runs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Step-level detail for a specific run
SELECT step_name, status, meta,
       started_at, finished_at
FROM agent_run_steps
WHERE agent_run_id = '<run-id>'
ORDER BY created_at;
```

### Usage Tracking

`usage_counters` tracks daily aggregates:

```sql
-- Daily usage for a team
SELECT day, metric, count
FROM usage_counters
WHERE team_id = '<team-id>'
ORDER BY day DESC, metric;
```

### Event Audit Log

`events` stores significant state changes:

```sql
-- Recent events
SELECT event_type, payload, created_at
FROM events
WHERE team_id = '<team-id>'
ORDER BY created_at DESC
LIMIT 50;
```

## Troubleshooting

### Common Issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| 401 on all API calls | JWT expired or invalid | Clear browser storage, re-login |
| Profile stuck < 80% | Missing required fields | Check `missingFields` from completeness endpoint |
| LinkedIn scrape hangs | BrightData timeout | Check trigger.dev dashboard; retry after 5 min |
| SSE stream cuts off | Vercel function timeout (10s default) | Use streaming runtime; check Vercel logs |
| Redux state stale | Browser cache | Hard refresh; clear localStorage |
| Type errors after schema change | Types not regenerated | Run `mcp__supabase__generate_typescript_types` |

### Useful Diagnostic Queries

```sql
-- Check a user's profile completeness breakdown
SELECT p.profile_completeness_score,
       (SELECT count(*) FROM user_skills WHERE user_id = p.user_id) as skills,
       (SELECT count(*) FROM user_experiences WHERE user_id = p.user_id) as experiences,
       (SELECT count(*) FROM user_educations WHERE user_id = p.user_id) as education,
       (SELECT count(*) FROM user_cv_files WHERE user_id = p.user_id) as cv_files,
       up.currency, up.hourly_min, up.hourly_max
FROM profiles p
JOIN user_preferences up ON up.user_id = p.user_id
WHERE p.user_id = '<user-id>';

-- Check onboarding progress state
SELECT settings_json->'onboardingProgress' as progress
FROM user_agent_settings
WHERE user_id = '<user-id>' AND agent_type = 'profile_parser';

-- Job ingestion stats
SELECT platform, count(*) as total,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours') as last_24h
FROM jobs
GROUP BY platform;
```

## Cost Management

### API Usage Monitoring

| Service | How to monitor | Alert threshold |
|---------|---------------|----------------|
| OpenAI | OpenAI dashboard usage page | $50/day |
| BrightData | BrightData dashboard | $20/day |
| Supabase | Project settings > Usage | 80% of plan limit |
| Vercel | Project settings > Usage | 80% of plan limit |
| trigger.dev | Dashboard > Usage | Task count per day |

### Cost Optimization Strategies

1. **Agent context pruning** - Only inject relevant profile data, not full history
2. **Structured outputs** - Reduce token usage vs. free-form generation
3. **Batch operations** - `upsert_jobs_and_rankings()` over individual inserts
4. **Scraping dedup** - Check `canonical_hash` before dispatching expensive scrapes
5. **Tightness-aware scheduling** - Higher tightness = more frequent but narrower queries
6. **Caching** - Cache profile context between agent runs within same session
