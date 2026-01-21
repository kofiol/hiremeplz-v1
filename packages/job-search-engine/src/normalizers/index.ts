// ============================================================================
// NORMALIZERS INDEX
// ============================================================================
// Exports all normalization functions and utilities.
// These are deterministic, pure functions with NO AI/LLM.
// ============================================================================

// Main normalizer
export {
  normalizeProfile,
  type NormalizeProfileOptions,
} from "./normalize-profile.js";

// Skill normalization utilities
export {
  toCanonicalSkillName,
  getSkillDisplayName,
  SKILL_ALIASES,
  ALIAS_TO_CANONICAL,
} from "./skill-aliases.js";

// Seniority inference
export {
  inferSeniorityLevel,
  getSeniorityThreshold,
  monthsToYears,
  yearsToMonths,
  SENIORITY_THRESHOLDS,
} from "./seniority-mapping.js";
