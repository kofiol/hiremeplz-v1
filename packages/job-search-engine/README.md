# @repo/job-search-engine

Type definitions and Zod schemas for the Job Search Engine pipeline.

## Overview

This package contains **pure types and validators only** — no business logic, no LLM usage, no external API calls. It defines the data contracts for all stages of the job search pipeline as described in `ARCHITECTURE.md`.

## Installation

```bash
pnpm add @repo/job-search-engine
```

## Package Structure

```
src/
├── schemas/                    # All Zod schemas and TypeScript types
│   ├── user-profile.schema.ts  # UserProfile, UserSkill, etc.
│   ├── normalized-profile.schema.ts
│   ├── search-spec.schema.ts   # LLM output schema
│   ├── raw-job.schema.ts       # LinkedIn/Upwork raw data
│   ├── normalized-job.schema.ts # Canonical job representation
│   ├── job-embedding.schema.ts  # Vector embeddings
│   ├── job-score.schema.ts     # LLM scoring output
│   ├── versioning.schema.ts    # Profile version & staleness
│   ├── index.ts                # Central export
│   └── __tests__/
│       ├── examples.ts         # Valid + invalid example objects
│       └── schemas.test.ts     # Validation tests
├── normalizers/                # Deterministic transformation functions
│   ├── normalize-profile.ts    # Main normalizeProfile() function
│   ├── skill-aliases.ts        # Skill name canonicalization
│   ├── seniority-mapping.ts    # Experience → seniority inference
│   ├── index.ts                # Normalizer exports
│   └── __tests__/
│       ├── normalize-profile.test.ts  # Determinism & order tests
│       ├── skill-aliases.test.ts
│       └── seniority-mapping.test.ts
├── agents/                     # AI reasoning steps (OpenAI Agents SDK)
│   ├── search-spec/            # Search Spec Generation Agent
│   │   ├── agent.ts
│   │   ├── cache.ts
│   │   ├── prompt.ts
│   │   └── schema.ts
│   └── index.ts                # Agents exports
├── validators/
│   └── index.ts                # Validation utilities
└── index.ts                    # Main entry point
```

## Usage

### Import Schemas

```typescript
import {
  UserProfileSchema,
  NormalizedJobSchema,
  JobScoreSchema,
  type UserProfile,
  type NormalizedJob,
  type JobScore,
} from "@repo/job-search-engine";

// Validate data
const profile = UserProfileSchema.parse(unknownData);
```

### Import Validators

```typescript
import {
  validateUserProfile,
  safeValidateJobScore,
  checkStaleness,
  isStale,
} from "@repo/job-search-engine/validators";

// Safe validation (returns result object)
const result = safeValidateJobScore(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// Check staleness
const staleness = checkStaleness(jobScore.profile_version, user.profile_version);
if (staleness.is_stale) {
  // Queue for recomputation
}
```

### Import Normalizers

```typescript
import { normalizeProfile } from "@repo/job-search-engine/normalizers";

const normalized = normalizeProfile(userProfile);
```

## Schemas Overview

### Pipeline Stage → Schema Mapping

| Pipeline Stage | Input Schema | Output Schema |
|---------------|--------------|---------------|
| Profile Normalization (NO LLM) | `UserProfile` | `NormalizedProfile` |
| Search Spec Generation (LLM) | `NormalizedProfile` | `SearchSpec` |
| Job Scraping (NO LLM) | `SearchSpec` | `RawJob` |
| Job Normalization (NO LLM) | `RawJob` | `NormalizedJob` |
| Job Embedding (NO LLM) | `NormalizedJob` | `JobEmbedding` |
| Candidate Retrieval (NO LLM) | `ProfileEmbedding` + `JobEmbedding[]` | `CandidateRetrievalResult` |
| Job Scoring (LLM) | `NormalizedJob` + `NormalizedProfile` | `JobScore` |

### Profile Versioning

All derived data tracks `profile_version` for cache invalidation:

```typescript
// Staleness rule: data is stale if
job_score.profile_version < user.profile_version

// Check with helpers
import { isStale, checkStaleness } from "@repo/job-search-engine/validators";

if (isStale(jobScore.profile_version, currentProfileVersion)) {
  // Score needs recomputation
}
```

**Version Rules:**
1. `profile_version` starts at 1 when a user profile is created
2. `profile_version` increments by 1 on ANY profile update
3. `profile_version` NEVER decrements
4. `profile_version` NEVER skips numbers
5. Stale data is hidden from UI and queued for recomputation
6. Old (stale) data is NEVER deleted (kept for analytics/debugging)

## Key Schemas

### UserProfile

Raw onboarding/profile data from Supabase. Aggregates data from `profiles`, `user_skills`, `user_experiences`, `user_educations`, and `user_preferences` tables.

```typescript
interface UserProfile {
  user_id: string;          // UUID
  team_id: string;          // UUID
  profile_version: number;  // >= 1, increments on changes
  skills: UserSkill[];
  experiences: UserExperience[];
  educations: UserEducation[];
  preferences: UserPreferences | null;
  // ...
}
```

### NormalizedProfile

Deterministic transformation of UserProfile. Reduces entropy before AI steps.

```typescript
interface NormalizedProfile {
  user_id: string;
  team_id: string;
  profile_version: number;  // MUST match source UserProfile
  total_experience_months: number;
  inferred_seniority: "entry" | "junior" | "mid" | "senior" | "lead" | "principal";
  primary_skills: NormalizedSkill[];  // Top 10 by level
  // ...
}
```

### SearchSpec

LLM-generated search parameters for job scraping.

```typescript
interface SearchSpec {
  profile_version: number;
  title_keywords: WeightedKeyword[];   // 1-10 required
  skill_keywords: WeightedKeyword[];   // 1-20 required
  negative_keywords: string[];         // 0-10 optional
  remote_preference: "remote_only" | "hybrid" | "onsite" | "flexible";
  // ...
}
```

### RawJob

Unprocessed job data from scraping (LinkedIn via Bright Data, Upwork API).

```typescript
// LinkedIn-specific
interface LinkedInRawJob {
  job_posting_id: string;
  job_title?: string;
  company_name?: string;
  job_seniority_level?: string;
  remote?: "remote" | "hybrid" | "onsite";
  // ...passthrough for unknown fields
}
```

### NormalizedJob

Canonical job representation matching the `jobs` table.

```typescript
interface NormalizedJob {
  id?: string;
  team_id: string;
  platform: "linkedin" | "upwork";
  platform_job_id: string;
  title: string;
  description: string;  // max 4000 chars
  canonical_hash: string;  // SHA-256, 64 chars
  skills: string[];  // sorted, deduplicated
  // ...
}
```

### JobEmbedding

Vector representation for semantic retrieval.

```typescript
interface JobEmbedding {
  job_id: string;
  embedding: number[];  // 1536 or 3072 dimensions
  embedding_model: "text-embedding-3-small" | "text-embedding-3-large";
  dimension: number;
  source_text_hash: string;  // For change detection
}
```

### JobScore

LLM-generated match score with explanation.

```typescript
interface JobScore {
  job_id: string;
  profile_version: number;  // For staleness tracking
  tightness: number;        // 1-5
  score: number;            // 0-100
  breakdown: ScoreBreakdown;
  summary?: string;         // Max 3 sentences
  reasoning: ReasoningPoint[];  // Max 5 bullet points
}
```

## Normalizers

The `normalizers/` directory contains **deterministic, pure functions** for transforming data. No AI, no heuristics, no external dependencies.

### normalizeProfile

Transforms `UserProfile` → `NormalizedProfile` with guaranteed determinism.

```typescript
import { normalizeProfile } from "@repo/job-search-engine/normalizers";

const normalized = normalizeProfile(userProfile);

// For deterministic testing (fixed date):
const normalized = normalizeProfile(userProfile, {
  referenceDate: new Date("2026-01-21"),
  normalizedAt: "2026-01-21T12:00:00.000Z"
});
```

**Guarantees:**
- **Same input → Same output** (given same options)
- **Order-insensitive** for arrays (skills, experiences, educations)
- **No side effects**
- **No external dependencies**

### Skill Normalization Rules

1. **Lowercase**: All skill names converted to lowercase
2. **Alias Resolution**: Common variations mapped to canonical names
   - `"Node.js"`, `"node"`, `"nodejs"` → `"nodejs"`
   - `"React.js"`, `"ReactJS"` → `"react"`
   - `"PostgreSQL"`, `"postgres"`, `"pg"` → `"postgresql"`
3. **Deduplication**: By canonical name, keep highest level/years
4. **Sorting**: By level DESC, years DESC, name ASC

### Seniority Inference Rules

Threshold-based mapping from total experience months:

| Months | Level | Years |
|--------|-------|-------|
| 0-23 | entry | 0-2 |
| 24-47 | junior | 2-4 |
| 48-71 | mid | 4-6 |
| 72-119 | senior | 6-10 |
| 120-179 | lead | 10-15 |
| 180+ | principal | 15+ |

```typescript
import { inferSeniorityLevel } from "@repo/job-search-engine/normalizers";

inferSeniorityLevel(60);  // "mid" (5 years)
inferSeniorityLevel(100); // "senior" (8.3 years)
```

## Testing

```bash
pnpm test
```

Tests validate:
- All valid examples pass schema validation
- All invalid examples fail with appropriate errors
- Cross-field refinements work correctly
- Versioning helpers behave as documented
- Profile normalization is deterministic and order-insensitive

## Example Objects

Use the exported examples for testing and documentation:

```typescript
import {
  VALID_USER_PROFILE,
  VALID_NORMALIZED_JOB,
  INVALID_JOB_SCORE_OUT_OF_RANGE,
} from "@repo/job-search-engine";

// Use in tests
expect(JobScoreSchema.safeParse(INVALID_JOB_SCORE_OUT_OF_RANGE).success).toBe(false);
```

## Design Principles

1. **No business logic** — This package is pure types and validation
2. **No LLM usage** — LLM schemas define contracts but don't invoke LLMs
3. **No external APIs** — No network calls, database queries, etc.
4. **Deterministic** — Same input always produces same result
5. **Order-insensitive** — Array order in input doesn't affect output
6. **Explicit nulls** — All nullable fields are explicitly `| null`, never `undefined`
7. **Passthrough for raw data** — Raw job schemas preserve unknown fields
