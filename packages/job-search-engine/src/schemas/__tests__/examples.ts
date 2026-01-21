// ============================================================================
// EXAMPLE OBJECTS - VALID AND INVALID
// ============================================================================
// This file contains example objects for all schemas.
// Use these for testing, documentation, and validation.
// ============================================================================

import type {
  UserProfile,
  NormalizedProfile,
  SearchSpec,
  RawJob,
  LinkedInRawJob,
  UpworkRawJob,
  NormalizedJob,
  JobEmbedding,
  JobScore,
} from "../index.js";

// ============================================================================
// USER PROFILE EXAMPLES
// ============================================================================

/**
 * Valid complete UserProfile
 */
export const VALID_USER_PROFILE: UserProfile = {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  email: "developer@example.com",
  display_name: "Jane Developer",
  timezone: "America/New_York",
  date_of_birth: "1990-05-15",
  plan: "pro",
  plan_ends_at: "2026-12-31T23:59:59.000Z",
  profile_completeness_score: 85,
  profile_version: 3,
  skills: [
    {
      id: "770e8400-e29b-41d4-a716-446655440002",
      name: "TypeScript",
      level: 5,
      years: 4.5,
      created_at: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440003",
      name: "React",
      level: 4,
      years: 3,
      created_at: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440004",
      name: "Node.js",
      level: 4,
      years: 5,
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
  experiences: [
    {
      id: "880e8400-e29b-41d4-a716-446655440005",
      title: "Senior Full Stack Developer",
      company: "TechCorp Inc",
      start_date: "2022-03-01",
      end_date: null, // Current position
      highlights: "Led development of microservices architecture. Mentored junior developers.",
      created_at: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "880e8400-e29b-41d4-a716-446655440006",
      title: "Full Stack Developer",
      company: "StartupXYZ",
      start_date: "2019-06-01",
      end_date: "2022-02-28",
      highlights: "Built React/Node.js applications. Implemented CI/CD pipelines.",
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
  educations: [
    {
      id: "990e8400-e29b-41d4-a716-446655440007",
      institution: "MIT",
      degree: "Bachelor of Science",
      field_of_study: "Computer Science",
      start_date: "2012-09-01",
      end_date: "2016-05-31",
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
  preferences: {
    platforms: ["linkedin", "upwork"],
    currency: "USD",
    hourly_min: 75,
    hourly_max: 150,
    fixed_budget_min: 5000,
    project_types: ["short_gig", "medium_project"],
    tightness: 3,
    updated_at: "2026-01-15T12:00:00.000Z",
  },
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2026-01-15T12:00:00.000Z",
};

/**
 * Valid minimal UserProfile (required fields only)
 */
export const VALID_USER_PROFILE_MINIMAL: UserProfile = {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  email: null,
  display_name: null,
  timezone: "UTC",
  date_of_birth: null,
  plan: "trial",
  plan_ends_at: null,
  profile_completeness_score: 0,
  profile_version: 1,
  skills: [],
  experiences: [],
  educations: [],
  preferences: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
};

/**
 * INVALID: profile_version is 0 (must be >= 1)
 */
export const INVALID_USER_PROFILE_ZERO_VERSION = {
  ...VALID_USER_PROFILE_MINIMAL,
  profile_version: 0, // ❌ Must be positive
};

/**
 * INVALID: profile_version is negative
 */
export const INVALID_USER_PROFILE_NEGATIVE_VERSION = {
  ...VALID_USER_PROFILE_MINIMAL,
  profile_version: -1, // ❌ Must be positive
};

/**
 * INVALID: skill level out of range
 */
export const INVALID_USER_PROFILE_BAD_SKILL = {
  ...VALID_USER_PROFILE_MINIMAL,
  skills: [
    {
      id: "770e8400-e29b-41d4-a716-446655440002",
      name: "TypeScript",
      level: 10, // ❌ Max is 5
      years: 4.5,
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
};

/**
 * INVALID: invalid UUID format
 */
export const INVALID_USER_PROFILE_BAD_UUID = {
  ...VALID_USER_PROFILE_MINIMAL,
  user_id: "not-a-uuid", // ❌ Invalid UUID
};

// ============================================================================
// NORMALIZED PROFILE EXAMPLES
// ============================================================================

/**
 * Valid NormalizedProfile
 */
export const VALID_NORMALIZED_PROFILE: NormalizedProfile = {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  profile_version: 3, // Must match source UserProfile
  display_name: "Jane Developer",
  timezone: "America/New_York",
  total_experience_months: 67, // ~5.5 years
  inferred_seniority: "mid",
  primary_skills: [
    {
      canonical_name: "typescript",
      display_name: "TypeScript",
      level: 5,
      years: 4.5,
    },
    {
      canonical_name: "nodejs",
      display_name: "Node.js",
      level: 4,
      years: 5,
    },
    {
      canonical_name: "react",
      display_name: "React",
      level: 4,
      years: 3,
    },
  ],
  secondary_skills: [],
  skill_keywords: ["typescript", "nodejs", "react"],
  experiences: [
    {
      title: "Senior Full Stack Developer",
      company: "TechCorp Inc",
      duration_months: 35,
      is_current: true,
      highlights: ["Led development of microservices architecture", "Mentored junior developers"],
    },
    {
      title: "Full Stack Developer",
      company: "StartupXYZ",
      duration_months: 32,
      is_current: false,
      highlights: ["Built React/Node.js applications", "Implemented CI/CD pipelines"],
    },
  ],
  title_keywords: ["senior full stack developer", "full stack developer"],
  educations: [
    {
      institution: "MIT",
      degree: "Bachelor of Science",
      field: "Computer Science",
      graduation_year: 2016,
    },
  ],
  highest_degree: "Bachelor of Science",
  preferences: {
    platforms: ["linkedin", "upwork"],
    hourly_rate: {
      min: 75,
      max: 150,
      currency: "USD",
    },
    fixed_budget: {
      min: 5000,
      currency: "USD",
    },
    tightness: 3,
    remote_preference: "flexible",
    contract_type: "any",
  },
  normalized_at: "2026-01-15T12:00:00.000Z",
};

/**
 * INVALID: profile_version mismatch (would need version match validation)
 */
export const INVALID_NORMALIZED_PROFILE_VERSION_ZERO = {
  ...VALID_NORMALIZED_PROFILE,
  profile_version: 0, // ❌ Must be positive
};

/**
 * INVALID: inferred_seniority not in enum
 */
export const INVALID_NORMALIZED_PROFILE_BAD_SENIORITY = {
  ...VALID_NORMALIZED_PROFILE,
  inferred_seniority: "super_senior", // ❌ Not a valid enum value
};

// ============================================================================
// SEARCH SPEC EXAMPLES
// ============================================================================

/**
 * Valid SearchSpec
 */
export const VALID_SEARCH_SPEC: SearchSpec = {
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  profile_version: 3,
  title_keywords: [
    { keyword: "Full Stack Developer", weight: 10 },
    { keyword: "Senior Software Engineer", weight: 8 },
    { keyword: "TypeScript Developer", weight: 7 },
  ],
  skill_keywords: [
    { keyword: "typescript", weight: 10 },
    { keyword: "react", weight: 9 },
    { keyword: "nodejs", weight: 9 },
    { keyword: "postgresql", weight: 6 },
  ],
  negative_keywords: ["unpaid", "equity only", "internship"],
  locations: [
    { country_code: "US", city: null, region: null },
  ],
  seniority_levels: ["mid", "senior"],
  remote_preference: "flexible",
  contract_types: ["freelance", "contract"],
  platforms: ["linkedin", "upwork"],
  hourly_min: 75,
  hourly_max: 150,
  fixed_budget_min: 5000,
  max_results_per_platform: 100,
  generated_at: "2026-01-15T12:00:00.000Z",
};

/**
 * INVALID: no title keywords
 */
export const INVALID_SEARCH_SPEC_NO_TITLES = {
  ...VALID_SEARCH_SPEC,
  title_keywords: [], // ❌ At least 1 required
};

/**
 * INVALID: no skill keywords
 */
export const INVALID_SEARCH_SPEC_NO_SKILLS = {
  ...VALID_SEARCH_SPEC,
  skill_keywords: [], // ❌ At least 1 required
};

/**
 * INVALID: hourly_min > hourly_max
 */
export const INVALID_SEARCH_SPEC_BAD_RATE = {
  ...VALID_SEARCH_SPEC,
  hourly_min: 200,
  hourly_max: 100, // ❌ min > max (fails refinement)
};

// ============================================================================
// RAW JOB EXAMPLES
// ============================================================================

/**
 * Valid LinkedIn RawJob
 */
export const VALID_LINKEDIN_RAW_JOB: LinkedInRawJob = {
  job_posting_id: "3842791563",
  url: "https://www.linkedin.com/jobs/view/3842791563",
  job_title: "Senior Full Stack Engineer",
  company_name: "Acme Corporation",
  job_location: "Remote, United States",
  job_summary: "Join our team to build next-generation web applications.",
  job_seniority_level: "Mid-Senior level",
  job_function: "Engineering",
  job_industries: "Software Development",
  company_url: "https://www.linkedin.com/company/acme-corp",
  job_posted_time: "2 days ago",
  job_num_applicants: 45,
  apply_link: "https://www.linkedin.com/jobs/view/3842791563/apply",
  country_code: "US",
  company_logo: "https://media.licdn.com/dms/image/acme_logo.jpg",
  job_posted_date: "2026-01-19",
  job_description_formatted: "We are looking for a Senior Full Stack Engineer with experience in TypeScript, React, and Node.js. You will work on building scalable web applications...",
  is_easy_apply: true,
  remote: "remote",
  timestamp: "2026-01-21T10:30:00.000Z",
};

/**
 * Valid Upwork RawJob
 */
export const VALID_UPWORK_RAW_JOB: UpworkRawJob = {
  job_posting_id: "~01abc123def456",
  url: "https://www.upwork.com/jobs/~01abc123def456",
  job_title: "React/Node.js Developer for SaaS Platform",
  company_name: "Tech Startup",
  job_location: "Worldwide",
  description: "Looking for an experienced developer to help build our SaaS platform. Must have strong TypeScript skills and experience with React and Node.js.",
  category: "Web Development",
  subcategory: "Full Stack Development",
  skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
  budget_type: "hourly",
  hourly_rate: { min: 50, max: 100 },
  client_country: "United States",
  client_payment_verified: true,
  client_rating: 4.8,
  client_hires: 23,
  client_total_spent: 150000,
  experience_level: "expert",
  duration: "More than 6 months",
  weekly_hours: "30+ hrs/week",
};

/**
 * INVALID: Missing job_posting_id
 */
export const INVALID_RAW_JOB_NO_ID = {
  job_title: "Developer",
  company_name: "Acme",
  // ❌ Missing job_posting_id and id
};

/**
 * INVALID: Missing title
 */
export const INVALID_RAW_JOB_NO_TITLE = {
  job_posting_id: "12345",
  company_name: "Acme",
  // ❌ Missing job_title and title
};

// ============================================================================
// NORMALIZED JOB EXAMPLES
// ============================================================================

/**
 * Valid NormalizedJob
 */
export const VALID_NORMALIZED_JOB: NormalizedJob = {
  id: "aa0e8400-e29b-41d4-a716-446655440010",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  platform: "linkedin",
  platform_job_id: "3842791563",
  company_name: "Acme Corporation",
  company_logo_url: "https://media.licdn.com/dms/image/acme_logo.jpg",
  title: "Senior Full Stack Engineer",
  description: "Senior Full Stack Engineer Company: Acme Corporation Location: Remote, United States Join our team to build next-generation web applications. We are looking for a Senior Full Stack Engineer with experience in TypeScript, React, and Node.js. You will work on building scalable web applications...",
  apply_url: "https://www.linkedin.com/jobs/view/3842791563/apply",
  posted_at: "2026-01-19T00:00:00.000Z",
  fetched_at: "2026-01-21T10:30:00.000Z",
  budget_type: "unknown",
  fixed_budget_min: null,
  fixed_budget_max: null,
  hourly_min: null,
  hourly_max: null,
  currency: "USD",
  client_country: "US",
  client_rating: null,
  client_hires: null,
  client_payment_verified: null,
  skills: ["nodejs", "react", "typescript"],
  seniority: "Mid-Senior level",
  category: "Engineering | Software Development",
  canonical_hash: "a".repeat(64), // SHA-256 is 64 hex chars
  source_raw: VALID_LINKEDIN_RAW_JOB,
  created_at: "2026-01-21T10:30:00.000Z",
};

/**
 * INVALID: canonical_hash wrong length
 */
export const INVALID_NORMALIZED_JOB_BAD_HASH = {
  ...VALID_NORMALIZED_JOB,
  canonical_hash: "abc123", // ❌ Must be 64 chars
};

/**
 * INVALID: title empty
 */
export const INVALID_NORMALIZED_JOB_NO_TITLE = {
  ...VALID_NORMALIZED_JOB,
  title: "", // ❌ Min length 1
};

/**
 * INVALID: apply_url not a valid URL
 */
export const INVALID_NORMALIZED_JOB_BAD_URL = {
  ...VALID_NORMALIZED_JOB,
  apply_url: "not-a-url", // ❌ Must be valid URL
};

// ============================================================================
// JOB EMBEDDING EXAMPLES
// ============================================================================

/**
 * Valid JobEmbedding (simplified - real embeddings have 1536 dimensions)
 */
export const VALID_JOB_EMBEDDING: JobEmbedding = {
  id: "bb0e8400-e29b-41d4-a716-446655440011",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  job_id: "aa0e8400-e29b-41d4-a716-446655440010",
  embedding: new Array(1536).fill(0).map((_, i) => Math.sin(i * 0.01)), // Example embedding
  embedding_model: "text-embedding-3-small",
  dimension: 1536,
  source_text_hash: "b".repeat(64),
  source_text_preview: "Senior Full Stack Engineer Company: Acme Corporation...",
  created_at: "2026-01-21T10:35:00.000Z",
  updated_at: "2026-01-21T10:35:00.000Z",
};

/**
 * INVALID: dimension doesn't match embedding array length
 */
export const INVALID_JOB_EMBEDDING_DIMENSION_MISMATCH = {
  ...VALID_JOB_EMBEDDING,
  dimension: 3072, // ❌ Says 3072 but array has 1536
};

/**
 * INVALID: dimension doesn't match model's expected dimension
 */
export const INVALID_JOB_EMBEDDING_WRONG_MODEL_DIMENSION = {
  ...VALID_JOB_EMBEDDING,
  embedding_model: "text-embedding-3-large" as const, // Expects 3072
  dimension: 1536, // ❌ Model expects 3072
};

// ============================================================================
// JOB SCORE EXAMPLES
// ============================================================================

/**
 * Valid JobScore
 */
export const VALID_JOB_SCORE: JobScore = {
  id: "cc0e8400-e29b-41d4-a716-446655440012",
  team_id: "660e8400-e29b-41d4-a716-446655440001",
  job_id: "aa0e8400-e29b-41d4-a716-446655440010",
  agent_run_id: null,
  profile_version: 3,
  tightness: 3,
  score: 85,
  breakdown: {
    factors: [
      { factor: "skills_match", score: 90, weight: 0.4, reason: "Strong TypeScript and React experience" },
      { factor: "experience_match", score: 85, weight: 0.3, reason: "Seniority level matches" },
      { factor: "budget_match", score: 80, weight: 0.2, reason: "Rate within expected range" },
      { factor: "location_match", score: 100, weight: 0.1, reason: "Remote position" },
    ],
    skills_match: 90,
    experience_match: 85,
    budget_match: 80,
    location_match: 100,
  },
  summary: "Excellent match for your skills and experience level. This senior full-stack role at Acme Corporation aligns well with your TypeScript and React expertise.",
  reasoning: [
    { type: "positive", text: "Requires TypeScript and React - your top skills" },
    { type: "positive", text: "Remote position matches your preference" },
    { type: "positive", text: "Seniority level appropriate for your experience" },
    { type: "neutral", text: "Salary not specified - need to negotiate" },
  ],
  created_at: "2026-01-21T11:00:00.000Z",
};

/**
 * INVALID: score out of range
 */
export const INVALID_JOB_SCORE_OUT_OF_RANGE = {
  ...VALID_JOB_SCORE,
  score: 150, // ❌ Max is 100
};

/**
 * INVALID: tightness out of range
 */
export const INVALID_JOB_SCORE_BAD_TIGHTNESS = {
  ...VALID_JOB_SCORE,
  tightness: 10, // ❌ Max is 5
};

/**
 * INVALID: profile_version is 0
 */
export const INVALID_JOB_SCORE_ZERO_VERSION = {
  ...VALID_JOB_SCORE,
  profile_version: 0, // ❌ Must be positive
};

/**
 * INVALID: too many reasoning points
 */
export const INVALID_JOB_SCORE_TOO_MANY_REASONS = {
  ...VALID_JOB_SCORE,
  reasoning: [
    { type: "positive" as const, text: "Reason 1" },
    { type: "positive" as const, text: "Reason 2" },
    { type: "positive" as const, text: "Reason 3" },
    { type: "positive" as const, text: "Reason 4" },
    { type: "positive" as const, text: "Reason 5" },
    { type: "positive" as const, text: "Reason 6" }, // ❌ Max is 5
  ],
};

// ============================================================================
// STALENESS EXAMPLES
// ============================================================================

/**
 * Example of stale data scenario
 */
export const STALENESS_EXAMPLE = {
  /** Job score was computed with profile version 3 */
  job_score_version: 3,

  /** User has since updated their profile twice, now at version 5 */
  current_profile_version: 5,

  /** The job score is stale (3 < 5) */
  is_stale: true,

  /** Version gap is 2 */
  version_gap: 2,
};

/**
 * Example of fresh data scenario
 */
export const FRESH_EXAMPLE = {
  /** Job score was computed with profile version 5 */
  job_score_version: 5,

  /** User profile is still at version 5 */
  current_profile_version: 5,

  /** The job score is fresh (5 >= 5) */
  is_stale: false,

  /** Version gap is 0 */
  version_gap: 0,
};
