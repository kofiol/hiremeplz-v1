import { z } from "zod";

// ============================================================================
// RAW JOB SCHEMA
// ============================================================================
// RawJob represents the unprocessed job data as received from scraping sources
// (LinkedIn via Bright Data, Upwork API, etc.).
//
// INVARIANTS:
// - Stored once in job_sources table
// - NEVER modified after ingestion
// - Contains all original fields from source (including unknown fields)
// - Used as input for Job Normalization stage (NO LLM)
// - Platform-specific schemas extend the base raw job schema
// ============================================================================

/**
 * Base schema for fields common across all platforms
 */
export const RawJobBaseSchema = z.object({
  /** Unique job ID from the platform */
  job_posting_id: z.string().min(1).optional(),

  /** Job URL */
  url: z.string().url().optional(),

  /** Job title */
  job_title: z.string().optional(),

  /** Company/client name */
  company_name: z.string().optional(),

  /** Job location (may include remote indicator) */
  job_location: z.string().optional(),

  /** Brief job summary */
  job_summary: z.string().optional(),

  /** Posted time (relative or absolute) */
  job_posted_time: z.string().optional(),

  /** Posted date (ISO format if available) */
  job_posted_date: z.string().nullable().optional(),

  /** Number of applicants */
  job_num_applicants: z.number().int().nonnegative().optional(),

  /** Direct apply link */
  apply_link: z.string().url().nullable().optional(),

  /** ISO 3166-1 alpha-2 country code */
  country_code: z.string().nullable().optional(),

  /** Company logo URL */
  company_logo: z.string().url().nullable().optional(),

  /** Timestamp when job was scraped */
  timestamp: z.string().datetime().optional(),
});

// ============================================================================
// LINKEDIN RAW JOB SCHEMA
// ============================================================================

/**
 * LinkedIn-specific raw job fields (from Bright Data)
 *
 * Field names match Bright Data's LinkedIn Jobs Scraper output.
 */
export const LinkedInRawJobSchema = RawJobBaseSchema.extend({
  /** LinkedIn-specific job posting ID */
  job_posting_id: z.string().min(1),

  /** Seniority level (e.g., "Entry level", "Mid-Senior level") */
  job_seniority_level: z.string().optional(),

  /** Job function/category (e.g., "Engineering") */
  job_function: z.string().optional(),

  /** Industries (e.g., "Software Development") */
  job_industries: z.string().optional(),

  /** Company URL on LinkedIn */
  company_url: z.string().url().optional(),

  /** LinkedIn title ID (internal) */
  title_id: z.string().nullable().optional(),

  /** Job poster profile */
  job_poster: z.string().nullable().optional(),

  /** Whether application is available */
  application_availability: z.boolean().optional(),

  /** Full formatted job description (HTML or text) */
  job_description_formatted: z.string().optional(),

  /** Base salary information */
  base_salary: z.unknown().optional(),

  /** Salary standards/ranges */
  salary_standards: z.unknown().optional(),

  /** Whether Easy Apply is enabled */
  is_easy_apply: z.boolean().optional(),

  /** Remote work type */
  remote: z.enum(["remote", "hybrid", "onsite"]).optional(),

  /** Discovery input metadata */
  discovery_input: z.record(z.unknown()).optional(),

  /** Original input data */
  input: z.object({
    url: z.string().url().optional(),
    discovery_input: z.record(z.unknown()).optional(),
  }).optional(),
}).passthrough(); // Allow additional unknown fields

export type LinkedInRawJob = z.infer<typeof LinkedInRawJobSchema>;

// ============================================================================
// UPWORK RAW JOB SCHEMA
// ============================================================================

/**
 * Upwork-specific raw job fields
 *
 * Fields based on Upwork RSS/API responses.
 */
export const UpworkRawJobSchema = RawJobBaseSchema.extend({
  /** Upwork job UID/ciphertext */
  job_posting_id: z.string().min(1),

  /** Job title */
  job_title: z.string().min(1),

  /** Client company name (may be individual) */
  company_name: z.string().optional(),

  /** Full job description */
  description: z.string().optional(),

  /** Job category on Upwork */
  category: z.string().optional(),

  /** Subcategory */
  subcategory: z.string().optional(),

  /** Required skills array */
  skills: z.array(z.string()).optional(),

  // ---- Budget/Payment ----
  /** Budget type */
  budget_type: z.enum(["hourly", "fixed"]).optional(),

  /** Hourly rate range */
  hourly_rate: z.object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
  }).optional(),

  /** Fixed price budget */
  fixed_price: z.number().nonnegative().optional(),

  // ---- Client Info ----
  /** Client country */
  client_country: z.string().optional(),

  /** Client payment verified */
  client_payment_verified: z.boolean().optional(),

  /** Client rating (0-5) */
  client_rating: z.number().min(0).max(5).optional(),

  /** Total client hires */
  client_hires: z.number().int().nonnegative().optional(),

  /** Total spent by client */
  client_total_spent: z.number().nonnegative().optional(),

  // ---- Job Details ----
  /** Experience level required */
  experience_level: z.enum(["entry", "intermediate", "expert"]).optional(),

  /** Expected duration */
  duration: z.string().optional(),

  /** Weekly hours commitment */
  weekly_hours: z.string().optional(),

  /** Contract to hire possibility */
  contract_to_hire: z.boolean().optional(),
}).passthrough();

export type UpworkRawJob = z.infer<typeof UpworkRawJobSchema>;

// ============================================================================
// GENERIC RAW JOB (UNION TYPE)
// ============================================================================

/**
 * Generic RawJob that accepts any platform-specific job
 * with passthrough for unknown fields.
 *
 * INVARIANTS:
 * - Must have job_posting_id (required for deduplication)
 * - Must have at least one of: job_title, title
 * - All other fields are optional
 * - Unknown fields are preserved (passthrough)
 */
export const RawJobSchema = z.object({
  /** Platform-specific job ID (REQUIRED) */
  job_posting_id: z.string().min(1).optional(),

  /** Alternative job ID field */
  id: z.string().min(1).optional(),

  /** Job URL */
  url: z.string().optional(),

  /** Job title */
  job_title: z.string().optional(),

  /** Alternative title field */
  title: z.string().optional(),

  /** Company name */
  company_name: z.string().optional(),

  /** Location */
  job_location: z.string().optional(),

  /** Summary or description */
  job_summary: z.string().optional(),

  /** Full description */
  description: z.string().optional(),

  /** Formatted description */
  job_description_formatted: z.string().optional(),

  /** Seniority level */
  job_seniority_level: z.string().optional(),

  /** Job function/category */
  job_function: z.string().optional(),

  /** Industries */
  job_industries: z.string().optional(),

  /** Company URL */
  company_url: z.string().optional(),

  /** Posted time */
  job_posted_time: z.string().optional(),

  /** Number of applicants */
  job_num_applicants: z.number().optional(),

  /** Apply link */
  apply_link: z.string().nullable().optional(),

  /** Country code */
  country_code: z.string().nullable().optional(),

  /** Title ID */
  title_id: z.string().nullable().optional(),

  /** Company logo URL */
  company_logo: z.string().nullable().optional(),

  /** Posted date */
  job_posted_date: z.string().nullable().optional(),

  /** Job poster */
  job_poster: z.string().nullable().optional(),

  /** Application availability */
  application_availability: z.boolean().optional(),

  /** Salary info */
  base_salary: z.unknown().optional(),
  salary_standards: z.unknown().optional(),

  /** Easy apply flag */
  is_easy_apply: z.boolean().optional(),

  /** Remote work type */
  remote: z.string().optional(),

  /** Scrape timestamp */
  timestamp: z.string().optional(),

  /** Input metadata */
  input: z.object({
    url: z.string().optional(),
    discovery_input: z.record(z.unknown()).optional(),
  }).optional(),

  /** Discovery input */
  discovery_input: z.record(z.unknown()).optional(),
}).passthrough().refine(
  (data) => {
    // Must have at least one job identifier
    return !!(data.job_posting_id || data.id);
  },
  {
    message: "RawJob must have job_posting_id or id",
  },
).refine(
  (data) => {
    // Must have at least one title field
    return !!(data.job_title || data.title);
  },
  {
    message: "RawJob must have job_title or title",
  },
);

export type RawJob = z.infer<typeof RawJobSchema>;

// ============================================================================
// JOB SOURCE RECORD (for job_sources table)
// ============================================================================

/**
 * Schema for job_sources table record
 */
export const JobSourceRecordSchema = z.object({
  id: z.string().uuid().optional(),
  team_id: z.string().uuid(),
  platform: z.enum(["upwork", "linkedin"]),
  platform_job_id: z.string().min(1),
  url: z.string().url().nullable(),
  fetched_at: z.string().datetime(),
  /** Original raw JSON from source (stored for debugging/reprocessing) */
  raw_json: z.unknown(),
});

export type JobSourceRecord = z.infer<typeof JobSourceRecordSchema>;
