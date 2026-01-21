// ============================================================================
// SEARCH SPEC LLM OUTPUT SCHEMA
// ============================================================================
// Zod schema for the LLM's structured output.
// This is a SUBSET of SearchSpec - only the fields the LLM generates.
// Identity fields (user_id, team_id, profile_version) are added after.
//
// CONSTRAINTS:
// - Must be compatible with OpenAI structured output
// - All fields have explicit types (no .optional() issues)
// - Arrays have min/max constraints
// - Strings have length limits
// ============================================================================

import { z } from "zod";

/**
 * Weighted keyword for LLM output.
 * Simpler than the full schema to reduce LLM errors.
 */
export const LLMWeightedKeywordSchema = z.object({
  keyword: z.string().min(1).max(100).describe("The search keyword or phrase"),
  weight: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Importance weight 1-10, higher = more important"),
});

/**
 * Location for LLM output.
 */
export const LLMLocationSchema = z.object({
  country_code: z
    .string()
    .length(2)
    .nullable()
    .describe("ISO 3166-1 alpha-2 country code or null"),
  city: z.string().max(100).nullable().describe("City name or null"),
  region: z.string().max(100).nullable().describe("State/region or null"),
});

/**
 * Seniority level enum for LLM.
 */
export const LLMSeniorityLevelSchema = z.enum([
  "entry",
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
]);

/**
 * Remote preference enum for LLM.
 */
export const LLMRemotePreferenceSchema = z.enum([
  "remote_only",
  "hybrid",
  "onsite",
  "flexible",
]);

/**
 * Contract type enum for LLM.
 */
export const LLMContractTypeSchema = z.enum([
  "freelance",
  "contract",
  "full_time",
  "part_time",
]);

/**
 * SearchSpec LLM Output Schema.
 *
 * This is what the LLM returns. After validation, we add:
 * - user_id, team_id, profile_version (from input profile)
 * - platforms (from profile preferences)
 * - generated_at (current timestamp)
 *
 * INVARIANTS:
 * - title_keywords: 1-10 items
 * - skill_keywords: 1-20 items
 * - negative_keywords: 0-10 items
 * - locations: 0-5 items
 * - seniority_levels: 0-6 items
 * - contract_types: 1-4 items
 */
export const SearchSpecLLMOutputSchema = z.object({
  // ---- Title Keywords ----
  title_keywords: z
    .array(LLMWeightedKeywordSchema)
    .min(1)
    .max(10)
    .describe("Job title keywords to search for (1-10)"),

  // ---- Skill Keywords ----
  skill_keywords: z
    .array(LLMWeightedKeywordSchema)
    .min(1)
    .max(20)
    .describe("Technical skill keywords (1-20)"),

  // ---- Negative Keywords ----
  negative_keywords: z
    .array(z.string().min(1).max(100))
    .max(10)
    .describe("Keywords to exclude from search (0-10)"),

  // ---- Locations ----
  locations: z
    .array(LLMLocationSchema)
    .max(5)
    .describe("Preferred job locations (0-5)"),

  // ---- Seniority ----
  seniority_levels: z
    .array(LLMSeniorityLevelSchema)
    .max(6)
    .describe("Acceptable seniority levels"),

  // ---- Remote Preference ----
  remote_preference: LLMRemotePreferenceSchema.describe(
    "Remote work preference",
  ),

  // ---- Contract Types ----
  contract_types: z
    .array(LLMContractTypeSchema)
    .min(1)
    .max(4)
    .describe("Contract types to search for"),

  // ---- Budget (passed through from profile) ----
  hourly_min: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Minimum hourly rate (USD) or null"),
  hourly_max: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Maximum hourly rate (USD) or null"),
  fixed_budget_min: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Minimum fixed budget (USD) or null"),
});

export type SearchSpecLLMOutput = z.infer<typeof SearchSpecLLMOutputSchema>;

/**
 * Validates LLM output and returns typed result.
 * Throws ZodError on validation failure.
 */
export function validateLLMOutput(data: unknown): SearchSpecLLMOutput {
  return SearchSpecLLMOutputSchema.parse(data);
}

/**
 * Safe validation that returns result object.
 */
export function safeValidateLLMOutput(data: unknown): {
  success: boolean;
  data?: SearchSpecLLMOutput;
  error?: z.ZodError;
} {
  const result = SearchSpecLLMOutputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
