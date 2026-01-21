import { z } from "zod";
import { PlatformSchema, UuidSchema } from "./user-profile.schema.js";

// ============================================================================
// NORMALIZED JOB SCHEMA
// ============================================================================
// NormalizedJob is the canonical representation of a job after deterministic
// normalization. It maps directly to the `jobs` table in Supabase.
//
// INVARIANTS:
// - Derived deterministically from RawJob (NO LLM)
// - Same RawJob input ALWAYS produces same NormalizedJob output
// - canonical_hash is computed from (team_id, platform, platform_job_id)
// - Stored once and NEVER modified (immutable after creation)
// - All text fields are whitespace-normalized and trimmed
// - description is truncated to 4000 chars max
// ============================================================================

/**
 * Budget type for a job posting
 */
export const BudgetTypeSchema = z.enum([
  "hourly",
  "fixed",
  "unknown",
]);

export type BudgetType = z.infer<typeof BudgetTypeSchema>;

/**
 * Seniority level as extracted from job posting
 */
export const JobSenioritySchema = z.enum([
  "entry_level",
  "mid_level",
  "senior_level",
  "lead",
  "executive",
  "unknown",
]).nullable();

export type JobSeniority = z.infer<typeof JobSenioritySchema>;

/**
 * Complete NormalizedJob matching the `jobs` table schema
 *
 * INVARIANTS:
 * - canonical_hash = SHA256(team_id + platform + platform_job_id)
 * - unique constraint: (team_id, canonical_hash)
 * - description max length: 4000 characters
 * - skills array: deduplicated, sorted alphabetically
 * - All nullable fields explicitly null (not undefined)
 */
export const NormalizedJobSchema = z.object({
  // ---- Identity ----
  /** UUID assigned by database (optional during creation) */
  id: UuidSchema.optional(),

  /** Team that owns this job record */
  team_id: UuidSchema,

  /** Source platform */
  platform: PlatformSchema,

  /** Platform-specific job ID (e.g., LinkedIn job_posting_id) */
  platform_job_id: z.string().min(1).max(100),

  // ---- Core Fields ----
  /** Company/client name */
  company_name: z.string().max(200).nullable(),

  /** Company logo URL */
  company_logo_url: z.string().url().max(2048).nullable(),

  /** Job title (normalized, max 200 chars) */
  title: z.string().min(1).max(200),

  /**
   * Job description (normalized, max 4000 chars)
   * Composed from title + company + location + summary + formatted description
   */
  description: z.string().min(1).max(4000),

  /** Direct application URL */
  apply_url: z.string().url().max(2048),

  /** When job was posted (ISO8601) */
  posted_at: z.string().datetime().nullable(),

  /** When job was scraped (ISO8601) */
  fetched_at: z.string().datetime().nullable(),

  // ---- Budget/Compensation ----
  /** Budget type: hourly, fixed, or unknown */
  budget_type: BudgetTypeSchema.default("unknown"),

  /** Fixed budget minimum (USD) */
  fixed_budget_min: z.number().nonnegative().nullable(),

  /** Fixed budget maximum (USD) */
  fixed_budget_max: z.number().nonnegative().nullable(),

  /** Hourly rate minimum (USD) */
  hourly_min: z.number().nonnegative().nullable(),

  /** Hourly rate maximum (USD) */
  hourly_max: z.number().nonnegative().nullable(),

  /** Currency code (ISO 4217) */
  currency: z.string().length(3).default("USD"),

  // ---- Client/Company Info ----
  /** Client country (ISO 3166-1 alpha-2 or full name) */
  client_country: z.string().max(100).nullable(),

  /** Client rating (0-5 scale for Upwork) */
  client_rating: z.number().min(0).max(5).nullable(),

  /** Total client hires */
  client_hires: z.number().int().nonnegative().nullable(),

  /** Whether client has verified payment method */
  client_payment_verified: z.boolean().nullable(),

  // ---- Metadata ----
  /**
   * Extracted skills (normalized, deduplicated, sorted)
   * Derived from job description using keyword matching
   */
  skills: z.array(z.string().min(1).max(50)).default([]),

  /** Seniority level extracted from job posting */
  seniority: z.string().max(50).nullable(),

  /** Job category/function */
  category: z.string().max(200).nullable(),

  /**
   * Canonical hash for deduplication
   * COMPUTED: SHA256(team_id + platform + platform_job_id)
   */
  canonical_hash: z.string().length(64),

  /** Original raw source data (for debugging/reprocessing) */
  source_raw: z.unknown().nullable(),

  // ---- Timestamps ----
  created_at: z.string().datetime().optional(),
});

export type NormalizedJob = z.infer<typeof NormalizedJobSchema>;

// ============================================================================
// NORMALIZED JOB CREATION (without DB-generated fields)
// ============================================================================

/**
 * Schema for creating a new NormalizedJob (before DB insertion)
 */
export const NormalizedJobCreateSchema = NormalizedJobSchema.omit({
  id: true,
  created_at: true,
});

export type NormalizedJobCreate = z.infer<typeof NormalizedJobCreateSchema>;

// ============================================================================
// NORMALIZED JOB FOR DISPLAY (subset of fields)
// ============================================================================

/**
 * Subset of NormalizedJob for UI display
 */
export const NormalizedJobDisplaySchema = z.object({
  id: UuidSchema,
  platform: PlatformSchema,
  company_name: z.string().nullable(),
  company_logo_url: z.string().url().nullable(),
  title: z.string(),
  description: z.string(),
  apply_url: z.string().url(),
  posted_at: z.string().datetime().nullable(),
  budget_type: BudgetTypeSchema,
  hourly_min: z.number().nullable(),
  hourly_max: z.number().nullable(),
  currency: z.string(),
  client_country: z.string().nullable(),
  skills: z.array(z.string()),
  seniority: z.string().nullable(),
});

export type NormalizedJobDisplay = z.infer<typeof NormalizedJobDisplaySchema>;

// ============================================================================
// CANONICAL HASH COMPUTATION
// ============================================================================

/**
 * Computes the canonical hash for a job.
 * Hash ensures uniqueness within a team for the same job from the same platform.
 *
 * NOTE: This is a type-level specification. Actual implementation uses crypto.
 * The function signature is provided here for documentation.
 *
 * @param teamId - Team UUID
 * @param platform - Source platform ("linkedin" | "upwork")
 * @param platformJobId - Platform-specific job ID
 * @returns SHA-256 hash (64 hex characters)
 */
export type ComputeCanonicalHash = (
  teamId: string,
  platform: "linkedin" | "upwork",
  platformJobId: string,
) => string;

// ============================================================================
// VALIDATION REFINEMENTS
// ============================================================================

/**
 * NormalizedJob with cross-field validations
 */
export const NormalizedJobSchemaRefined = NormalizedJobSchema.refine(
  (data) => {
    // If budget_type is hourly, at least one hourly rate should be set
    if (data.budget_type === "hourly") {
      return data.hourly_min !== null || data.hourly_max !== null;
    }
    return true;
  },
  {
    message: "Hourly jobs should have at least one hourly rate specified",
    path: ["hourly_min"],
  },
).refine(
  (data) => {
    // If budget_type is fixed, at least one fixed budget should be set
    if (data.budget_type === "fixed") {
      return data.fixed_budget_min !== null || data.fixed_budget_max !== null;
    }
    return true;
  },
  {
    message: "Fixed-price jobs should have at least one budget value specified",
    path: ["fixed_budget_min"],
  },
).refine(
  (data) => {
    // Hourly min should not exceed hourly max
    if (data.hourly_min !== null && data.hourly_max !== null) {
      return data.hourly_min <= data.hourly_max;
    }
    return true;
  },
  {
    message: "hourly_min cannot exceed hourly_max",
    path: ["hourly_min"],
  },
).refine(
  (data) => {
    // Fixed budget min should not exceed max
    if (data.fixed_budget_min !== null && data.fixed_budget_max !== null) {
      return data.fixed_budget_min <= data.fixed_budget_max;
    }
    return true;
  },
  {
    message: "fixed_budget_min cannot exceed fixed_budget_max",
    path: ["fixed_budget_min"],
  },
);
