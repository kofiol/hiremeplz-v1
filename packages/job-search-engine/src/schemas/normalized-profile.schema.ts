import { z } from "zod";
import { PlatformSchema, UuidSchema } from "./user-profile.schema.js";

// ============================================================================
// NORMALIZED PROFILE SCHEMA
// ============================================================================
// The NormalizedProfile is a deterministic transformation of UserProfile.
// It reduces entropy before any AI steps and stabilizes downstream prompts.
//
// INVARIANTS:
// - Derived deterministically from UserProfile (NO LLM, NO AI)
// - Same UserProfile input ALWAYS produces same NormalizedProfile output
// - profile_version is preserved from source UserProfile
// - All string fields are trimmed and normalized (lowercase where appropriate)
// - Empty arrays and null values are explicit (no undefined)
// ============================================================================

/**
 * Normalized skill representation
 * - name is lowercased and trimmed
 * - aliases are collapsed (e.g., "Next.js" → "nextjs")
 */
export const NormalizedSkillSchema = z.object({
  /** Canonical skill name (lowercase, no spaces, no dots) */
  canonical_name: z.string().min(1).max(50),
  /** Original display name */
  display_name: z.string().min(1).max(100),
  /** Proficiency level 1-5 */
  level: z.number().int().min(1).max(5),
  /** Years of experience (null if unknown) */
  years: z.number().nonnegative().nullable(),
});

export type NormalizedSkill = z.infer<typeof NormalizedSkillSchema>;

/**
 * Normalized experience summary
 * - Durations are computed and normalized
 * - Titles are cleaned and categorized
 */
export const NormalizedExperienceSchema = z.object({
  /** Cleaned job title */
  title: z.string().min(1).max(200),
  /** Company name (null if freelance/unknown) */
  company: z.string().max(200).nullable(),
  /** Duration in months (computed from start/end dates) */
  duration_months: z.number().int().nonnegative().nullable(),
  /** Whether this is the current position */
  is_current: z.boolean(),
  /** Key highlights/achievements as array of strings */
  highlights: z.array(z.string().max(500)).default([]),
});

export type NormalizedExperience = z.infer<typeof NormalizedExperienceSchema>;

/**
 * Normalized education summary
 */
export const NormalizedEducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().max(200).nullable(),
  field: z.string().max(200).nullable(),
  /** Graduation year (extracted from end_date) */
  graduation_year: z.number().int().min(1950).max(2100).nullable(),
});

export type NormalizedEducation = z.infer<typeof NormalizedEducationSchema>;

/**
 * Seniority level derived from experience
 */
export const SeniorityLevelSchema = z.enum([
  "entry",      // 0-2 years
  "junior",     // 2-4 years
  "mid",        // 4-6 years
  "senior",     // 6-10 years
  "lead",       // 10-15 years
  "principal",  // 15+ years
]);

export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;

/**
 * Remote work preference
 */
export const RemotePreferenceSchema = z.enum([
  "remote_only",
  "hybrid",
  "onsite",
  "flexible",
]);

export type RemotePreference = z.infer<typeof RemotePreferenceSchema>;

/**
 * Contract type preference
 */
export const ContractTypeSchema = z.enum([
  "freelance",
  "contract",
  "full_time",
  "part_time",
  "any",
]);

export type ContractType = z.infer<typeof ContractTypeSchema>;

/**
 * Normalized preferences for job search
 */
export const NormalizedPreferencesSchema = z.object({
  /** Platforms to search */
  platforms: z.array(PlatformSchema),
  /** Hourly rate range (in USD) */
  hourly_rate: z.object({
    min: z.number().nonnegative().nullable(),
    max: z.number().nonnegative().nullable(),
    currency: z.string().length(3).default("USD"),
  }),
  /** Fixed budget range (in USD) */
  fixed_budget: z.object({
    min: z.number().nonnegative().nullable(),
    currency: z.string().length(3).default("USD"),
  }),
  /** Matching tightness (1-5) */
  tightness: z.number().int().min(1).max(5),
  /** Remote work preference */
  remote_preference: RemotePreferenceSchema.default("flexible"),
  /** Contract type preference */
  contract_type: ContractTypeSchema.default("any"),
});

export type NormalizedPreferences = z.infer<typeof NormalizedPreferencesSchema>;

/**
 * Complete NormalizedProfile
 *
 * INVARIANTS:
 * - profile_version MUST match source UserProfile.profile_version
 * - total_experience_months is computed from experiences
 * - inferred_seniority is derived from total_experience_months
 * - primary_skills are top skills by level (max 10)
 * - secondary_skills are remaining skills
 */
export const NormalizedProfileSchema = z.object({
  // ---- Identity (preserved from UserProfile) ----
  user_id: UuidSchema,
  team_id: UuidSchema,

  // ---- Versioning (CRITICAL) ----
  /**
   * MUST match the source UserProfile.profile_version.
   * Used for cache invalidation and staleness checks.
   */
  profile_version: z.number().int().positive(),

  // ---- Basic Info ----
  display_name: z.string().max(200).nullable(),
  timezone: z.string(),

  // ---- Computed Experience Metrics ----
  /**
   * Total professional experience in months
   * Computed by summing all experience durations
   */
  total_experience_months: z.number().int().nonnegative(),

  /**
   * Derived seniority level based on total_experience_months
   * RULES:
   * - entry: 0-24 months
   * - junior: 24-48 months
   * - mid: 48-72 months
   * - senior: 72-120 months
   * - lead: 120-180 months
   * - principal: 180+ months
   */
  inferred_seniority: SeniorityLevelSchema,

  // ---- Normalized Skills ----
  /**
   * Top skills by proficiency level (max 10)
   * Sorted by level DESC, then by years DESC
   */
  primary_skills: z.array(NormalizedSkillSchema).max(10),

  /**
   * Remaining skills not in primary_skills
   */
  secondary_skills: z.array(NormalizedSkillSchema),

  /**
   * All unique skill names as a flat array (for keyword matching)
   */
  skill_keywords: z.array(z.string()).default([]),

  // ---- Normalized Experiences ----
  experiences: z.array(NormalizedExperienceSchema),

  /**
   * Unique job titles held (normalized, deduplicated)
   */
  title_keywords: z.array(z.string()).default([]),

  // ---- Normalized Education ----
  educations: z.array(NormalizedEducationSchema),

  /**
   * Highest degree level (for filtering)
   */
  highest_degree: z.string().nullable(),

  // ---- Preferences ----
  preferences: NormalizedPreferencesSchema,

  // ---- Metadata ----
  /**
   * ISO8601 timestamp when this normalized profile was generated
   */
  normalized_at: z.string().datetime(),
});

export type NormalizedProfile = z.infer<typeof NormalizedProfileSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that NormalizedProfile.profile_version matches UserProfile.profile_version
 */
export function validateProfileVersionMatch(
  userProfileVersion: number,
  normalizedProfileVersion: number,
): boolean {
  return userProfileVersion === normalizedProfileVersion;
}
