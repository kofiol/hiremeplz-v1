Job Engine – Architecture

Purpose

The Job Engine is a deterministic, versioned pipeline that:
 1. Finds relevant freelance / job opportunities
 2. Normalizes and indexes them
 3. Matches them against a user profile
 4. Produces stable, explainable match scores and summaries
 5. Ensures results always reflect the latest user profile version

This system is not a single AI agent.
It is a pipeline with limited AI stages.

⸻

Core Principles
 1. One responsibility per stage
 2. LLMs only where reasoning is required
 3. All LLM outputs must conform to strict schemas
 4. User profile versioning drives recomputation
 5. Cheap steps first, expensive steps last
 6. Async by default for anything involving LLMs

⸻

High-Level Pipeline

User Profile (versioned)
        ↓
Profile Normalization (deterministic)
        ↓
Search Spec Generation (LLM, cached)
        ↓
Job Scraping (LinkedIn via Apify)
        ↓
Job Normalization (deterministic)
        ↓
Job Embedding (vector)
        ↓
Candidate Retrieval (vector similarity)
        ↓
Job Scoring + Summary (LLM)
        ↓
Persist Scored Jobs (versioned)


⸻

Data Model Overview

User Profile
 • Stored in Supabase
 • Versioned (profile_version)
 • Updated during onboarding or profile edits

Job (Raw)
 • Source: LinkedIn scrape
 • Stored once
 • Never modified after ingestion

Job (Embedded)
 • Vector representation of normalized job text
 • Used only for retrieval

Job Score
 • (job_id, user_id, profile_version)
 • Contains:
 • match score (0–100)
 • short summary
 • reasoning
 • Multiple versions may exist for the same job

⸻

Stage-by-Stage Breakdown

1. Profile Normalization (NO LLM)

Input
 • Raw onboarding/profile data from Supabase

Output
 • NormalizedProfile

Rules
 • Deterministic
 • No AI
 • Same input → same output

Purpose
 • Reduce entropy before any AI step
 • Stabilize downstream prompts

⸻

2. Search Spec Generation (LLM – small, cached)

Input
 • NormalizedProfile

Output
 • SearchSpec (strict JSON schema)

Includes:
 • title keywords
 • skill keywords
 • negative keywords
 • locations
 • seniority
 • contract type
 • remote preference

Rules
 • One prompt
 • One schema
 • Cached by profile_version
 • Re-run ONLY when profile changes

⸻

3. Job Scraping (NO LLM)

Input
 • SearchSpec

Output
 • Raw job listings from LinkedIn

Notes
 • Uses Apify
 • Filters are enforced at scrape time
 • No AI involvement

⸻

4. Job Normalization (NO LLM)

Input
 • Raw scraped job

Output
 • NormalizedJob

Includes:
 • title
 • company
 • location
 • cleaned description
 • apply link
 • metadata (visa, years, etc.)

Rules
 • Deterministic
 • No summarization
 • No scoring

⸻

5. Job Embedding (NO reasoning)

Input
 • Normalized job text

Output
 • Vector embedding (pgvector)

Purpose
 • Semantic retrieval only
 • No decision-making

⸻

6. Candidate Retrieval (NO LLM)

Input
 • User profile embedding
 • Job embeddings

Output
 • Top K jobs (30–50)

Rules
 • Pure vector similarity
 • Fast and cheap
 • No reasoning

⸻

7. Job Scoring & Summary (LLM – expensive, async)

Input
 • Single job + NormalizedProfile

Output
 • ScoredJob

Includes:
 • match_score (0–100)
 • short summary (max 3 sentences)
 • bullet-point reasoning

Rules
 • Strict JSON schema
 • One job per call (or very small batch)
 • Executed async (Trigger.dev)
 • Stored with profile_version

⸻

Profile Versioning & Staleness
 • Every profile update increments profile_version
 • A job score is stale if:

job_score.profile_version < user.profile_version


 • Stale scores:
 • Are hidden from UI
 • Are enqueued for recomputation
 • Old scores are never deleted

⸻

What Uses LLMs (Explicit)

Stage LLM
Search Spec Generation ✅
Job Scoring & Summary ✅
Profile Normalization ❌
Scraping ❌
Embedding ❌
Retrieval ❌
Versioning ❌


⸻

Non-Goals (Explicitly Out of Scope)
 • Autonomous agents deciding pipeline flow
 • Re-scoring entire job database on every profile change
 • Multi-job mega-prompts
 • LLM-based filtering instead of deterministic filters
 • Explaining architecture inside prompts

⸻

Operational Notes
 • All LLM calls must:

• Use schemas
 • Be retry-safe
 • Be logged with inputs/outputs
 • Prompt text lives in separate files (*.prompt.ts)
 • Code never re-generates prompts dynamically

⸻

Mental Model

This system is:

A compiler pipeline where LLMs are used only for semantic reasoning steps.

Not:
 • A chatbot
 • A single agent
 • A prompt experiment