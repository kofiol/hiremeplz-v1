import { z } from "zod";

// ============================================================================
// USER PROFILE SCHEMA
// ============================================================================
// The UserProfile represents the raw onboarding/profile data stored in Supabase.
// It aggregates data from multiple tables: profiles, user_skills, user_experiences,
// user_educations, and user_preferences.
//
// INVARIANTS:
// - profile_version MUST be a positive integer (starts at 1)
// - profile_version increments on ANY profile update
// - team_id and user_id are UUIDs in standard format
// - All timestamps are ISO8601 strings
// ============================================================================

/**
 * UUID v4 format validation
 */
export const UuidSchema = z.string().uuid();

/**
 * Skill level: 1-5 scale
 * 1 = Beginner, 2 = Elementary, 3 = Intermediate, 4 = Advanced, 5 = Expert
 */
export const SkillLevelSchema = z.number().int().min(1).max(5);

/**
 * User skill as stored in user_skills table
 */
export const UserSkillSchema = z.object({
  id: UuidSchema,
  name: z.string().min(1).max(100),
  /** Proficiency level 1-5 */
  level: SkillLevelSchema.default(3),
  /** Years of experience with this skill */
  years: z.number().nonnegative().nullable(),
  created_at: z.string().datetime(),
});

export type UserSkill = z.infer<typeof UserSkillSchema>;

/**
 * User experience as stored in user_experiences table
 */
export const UserExperienceSchema = z.object({
  id: UuidSchema,
  title: z.string().min(1).max(200),
  company: z.string().max(200).nullable(),
  /** ISO date string (YYYY-MM-DD) */
  start_date: z.string().date().nullable(),
  /** ISO date string (YYYY-MM-DD), null means current position */
  end_date: z.string().date().nullable(),
  /** Key achievements/responsibilities */
  highlights: z.string().max(5000).nullable(),
  created_at: z.string().datetime(),
});

export type UserExperience = z.infer<typeof UserExperienceSchema>;

/**
 * User education record
 */
export const UserEducationSchema = z.object({
  id: UuidSchema,
  institution: z.string().min(1).max(200),
  degree: z.string().max(200).nullable(),
  field_of_study: z.string().max(200).nullable(),
  start_date: z.string().date().nullable(),
  end_date: z.string().date().nullable(),
  created_at: z.string().datetime(),
});

export type UserEducation = z.infer<typeof UserEducationSchema>;

/**
 * Supported platforms for job search
 */
export const PlatformSchema = z.enum(["upwork", "linkedin"]);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Project type preferences
 */
export const ProjectTypeSchema = z.enum([
  "short_gig",
  "medium_project",
  "long_term",
  "full_time",
]);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

/**
 * User job search preferences as stored in user_preferences table
 */
export const UserPreferencesSchema = z.object({
  /** Platforms to search (upwork, linkedin) */
  platforms: z.array(PlatformSchema).default(["upwork", "linkedin"]),
  /** Preferred currency for rates */
  currency: z.string().length(3).default("USD"),
  /** Minimum hourly rate */
  hourly_min: z.number().nonnegative().nullable(),
  /** Maximum hourly rate */
  hourly_max: z.number().nonnegative().nullable(),
  /** Minimum fixed budget for projects */
  fixed_budget_min: z.number().nonnegative().nullable(),
  /** Project type preferences */
  project_types: z.array(ProjectTypeSchema).default(["short_gig", "medium_project"]),
  /**
   * Tightness score (1-5): How strictly to match jobs
   * 1 = Very loose (more results, lower precision)
   * 5 = Very strict (fewer results, higher precision)
   */
  tightness: z.number().int().min(1).max(5).default(3),
  updated_at: z.string().datetime(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/**
 * Complete UserProfile aggregating all profile data
 *
 * INVARIANTS:
 * - profile_version >= 1 (always positive)
 * - profile_version increments on ANY profile change
 * - If profile is incomplete, profile_completeness_score < 100
 */
export const UserProfileSchema = z.object({
  // ---- Identity ----
  user_id: UuidSchema,
  team_id: UuidSchema,

  // ---- Basic Info ----
  email: z.string().email().nullable(),
  display_name: z.string().max(200).nullable(),
  timezone: z.string().default("UTC"),
  date_of_birth: z.string().date().nullable(),

  // ---- Plan ----
  plan: z.enum(["trial", "starter", "pro", "enterprise"]).default("trial"),
  plan_ends_at: z.string().datetime().nullable(),

  // ---- Profile Completeness ----
  /**
   * Score 0-100 indicating how complete the profile is.
   * Used to prompt users to fill in missing information.
   */
  profile_completeness_score: z.number().min(0).max(100).default(0),

  // ---- Versioning ----
  /**
   * CRITICAL: profile_version tracks profile changes for cache invalidation.
   * - Starts at 1 when profile is created
   * - Increments by 1 on ANY profile update (skills, experience, preferences, etc.)
   * - Used to determine if job scores are stale
   * - NEVER decrements
   */
  profile_version: z.number().int().positive().default(1),

  // ---- Related Data ----
  skills: z.array(UserSkillSchema).default([]),
  experiences: z.array(UserExperienceSchema).default([]),
  educations: z.array(UserEducationSchema).default([]),
  preferences: UserPreferencesSchema.nullable(),

  // ---- Timestamps ----
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ============================================================================
// PARTIAL SCHEMAS FOR UPDATES
// ============================================================================

/**
 * Schema for updating user profile (all fields optional except user_id)
 */
export const UserProfileUpdateSchema = UserProfileSchema.partial().required({
  user_id: true,
  team_id: true,
});

export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
