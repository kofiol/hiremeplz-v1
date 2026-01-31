---
type: spec
title: Job Search Agent
status: planned
updated: 2026-01-31
context_for_agents: >
  Planned agent that monitors job sources (Upwork, LinkedIn) on a schedule,
  ingests raw listings, normalizes them into the jobs table, and deduplicates
  via canonical_hash. Triggers the ranking-agent after ingestion. Will run
  as a trigger.dev scheduled task. Database tables (jobs, job_sources,
  job_rankings) are already built with 3161 test jobs in production.
tags: [agents, jobs, planned]
---

# Job Search Agent

The core discovery engine. Monitors freelance job sources, ingests listings, normalizes data, and triggers downstream scoring.

## Purpose

Replace the freelancer's daily manual search across platforms with a continuous, automated monitor that:
1. Fetches new listings from configured sources
2. Normalizes heterogeneous platform data into a unified schema
3. Deduplicates across sources (same job posted on multiple platforms)
4. Stores raw + normalized data for audit and reprocessing
5. Triggers the [[ranking-agent]] to score new jobs

## Architecture

```
Scheduler (trigger.dev cron)
  |
  v
Job Search Agent
  |
  ├── Upwork Fetcher (BrightData dataset / Apify actor)
  ├── LinkedIn Fetcher (BrightData dataset)
  └── [Future] RSS / Email / Custom source fetchers
  |
  v
Normalizer
  |
  v
Deduplicator (canonical_hash)
  |
  v
upsert_jobs_and_rankings() -- batch write
  |
  v
Event: new_jobs_ingested
  |
  v
Ranking Agent (triggered)
```

## Data Sources

### Upwork
- **Method:** BrightData dataset or Apify actor
- **Query construction:** Built from user preferences (skills, category, budget range)
- **Refresh interval:** Every 1-4 hours (configurable via `tightness`)
- **Fields extracted:** title, description, budget, client info, skills, category, seniority

### LinkedIn
- **Method:** BrightData dataset
- **Query construction:** Skill-based search with location/remote filters
- **Refresh interval:** Every 4-12 hours (LinkedIn rate limits are stricter)
- **Fields extracted:** title, description, company, apply_url, posted_at

### Future Sources
- RSS feeds (niche job boards, industry newsletters)
- Email parsing (forwarded job alerts from other services)
- Slack/Discord channel monitoring
- Direct client referral tracking

## Normalization

Raw platform data is heterogeneous. The normalizer maps each source to the `jobs` table schema:

```typescript
interface NormalizedJob {
  platform: "upwork" | "linkedin"
  platformJobId: string
  title: string
  description: string
  applyUrl: string
  postedAt: Date | null
  budgetType: "hourly" | "fixed" | "unknown"
  hourlyMin: number | null
  hourlyMax: number | null
  fixedBudgetMin: number | null
  fixedBudgetMax: number | null
  currency: string
  clientCountry: string | null
  clientRating: number | null
  clientHires: number | null
  clientPaymentVerified: boolean | null
  skills: string[]
  seniority: string | null
  category: string | null
  companyName: string | null
  canonicalHash: string  // SHA256(platform + platformJobId + teamId)
}
```

## Deduplication

`canonical_hash = SHA256(platform + platform_job_id + team_id)`

This ensures:
- Same job from same platform is updated, not duplicated
- Same job posted on Upwork AND LinkedIn creates two records (different platforms, different apply URLs)
- Cross-platform semantic dedup is a future enhancement using [[data-model#embeddings]]

## Query Construction

The agent builds source-specific queries from user preferences:

```
Input: {
  skills: ["React", "TypeScript", "Node.js"],
  platforms: ["upwork"],
  projectTypes: ["medium_project"],
  hourlyMin: 75,
  tightness: 3
}

Output (Upwork query): {
  search_terms: "React TypeScript Node.js",
  category: "Web Development",
  budget_min: 1000,
  hourly_rate_min: 50,  // Lower than user min to catch borderline matches
  job_type: "fixed,hourly",
  duration: "1-3 months"
}
```

**Tightness affects query breadth:**
- 1-2: Broad queries, more keywords, lower budget floors
- 3: Balanced (default)
- 4-5: Narrow queries, exact skill match, strict budget filters

## Scheduling

Runs as a trigger.dev scheduled task:

| Tightness | Upwork interval | LinkedIn interval |
|-----------|----------------|-------------------|
| 1-2 | Every 4h | Every 12h |
| 3 | Every 2h | Every 6h |
| 4-5 | Every 1h | Every 4h |

Higher tightness = more frequent checks (the user wants precision, so fresher data matters more).

## Agent Run Record

```typescript
{
  agent_type: "job_search",
  trigger: "scheduled" | "manual",
  inputs: {
    platforms: string[],
    query_params: object,
    tightness: number
  },
  outputs: {
    jobs_fetched: number,
    jobs_new: number,
    jobs_updated: number,
    jobs_skipped: number,  // dedup
    duration_ms: number
  }
}
```

## Open Questions

- **Rate limiting:** How to handle BrightData/Apify rate limits across multiple users?
- **Cost control:** Each scrape costs money. Need per-user daily caps tied to plan tier.
- **Freshness vs. cost:** More frequent scraping = better results but higher cost. Need to find the sweet spot.
- **Cross-platform dedup:** Semantic matching (embeddings) to detect same opportunity on different platforms.
