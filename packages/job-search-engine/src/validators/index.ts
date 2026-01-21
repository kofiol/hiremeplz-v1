// ============================================================================
// VALIDATORS INDEX
// ============================================================================
// Re-exports validation utilities and refined schemas with cross-field checks.
// Use these for strict validation in production code.
// ============================================================================

export {
  // Refined schemas with cross-field validations
  SearchSpecSchemaRefined,
  NormalizedJobSchemaRefined,
  JobEmbeddingSchemaRefined,
  ProfileEmbeddingSchemaRefined,
  JobScoreSchemaRefined,

  // Profile version validation helpers
  validateProfileVersionMatch,
  checkStaleness,
  isStale,
  isFresh,
  validateVersionUpdate,
  getNextVersion,

  // Type guards and utilities
  type StalenessCheckResult,
} from "../schemas/index.js";

import {
  UserProfileSchema,
  NormalizedProfileSchema,
  SearchSpecSchemaRefined,
  RawJobSchema,
  LinkedInRawJobSchema,
  UpworkRawJobSchema,
  NormalizedJobSchemaRefined,
  JobEmbeddingSchemaRefined,
  JobScoreSchemaRefined,
} from "../schemas/index.js";

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a UserProfile object.
 * Throws ZodError on validation failure.
 */
export function validateUserProfile(data: unknown) {
  return UserProfileSchema.parse(data);
}

/**
 * Safely validates a UserProfile object.
 * Returns { success: true, data } or { success: false, error }.
 */
export function safeValidateUserProfile(data: unknown) {
  return UserProfileSchema.safeParse(data);
}

/**
 * Validates a NormalizedProfile object.
 */
export function validateNormalizedProfile(data: unknown) {
  return NormalizedProfileSchema.parse(data);
}

export function safeValidateNormalizedProfile(data: unknown) {
  return NormalizedProfileSchema.safeParse(data);
}

/**
 * Validates a SearchSpec object with cross-field validations.
 */
export function validateSearchSpec(data: unknown) {
  return SearchSpecSchemaRefined.parse(data);
}

export function safeValidateSearchSpec(data: unknown) {
  return SearchSpecSchemaRefined.safeParse(data);
}

/**
 * Validates a RawJob object (generic, accepts any platform).
 */
export function validateRawJob(data: unknown) {
  return RawJobSchema.parse(data);
}

export function safeValidateRawJob(data: unknown) {
  return RawJobSchema.safeParse(data);
}

/**
 * Validates a LinkedIn RawJob specifically.
 */
export function validateLinkedInRawJob(data: unknown) {
  return LinkedInRawJobSchema.parse(data);
}

export function safeValidateLinkedInRawJob(data: unknown) {
  return LinkedInRawJobSchema.safeParse(data);
}

/**
 * Validates an Upwork RawJob specifically.
 */
export function validateUpworkRawJob(data: unknown) {
  return UpworkRawJobSchema.parse(data);
}

export function safeValidateUpworkRawJob(data: unknown) {
  return UpworkRawJobSchema.safeParse(data);
}

/**
 * Validates a NormalizedJob with cross-field validations.
 */
export function validateNormalizedJob(data: unknown) {
  return NormalizedJobSchemaRefined.parse(data);
}

export function safeValidateNormalizedJob(data: unknown) {
  return NormalizedJobSchemaRefined.safeParse(data);
}

/**
 * Validates a JobEmbedding with dimension checks.
 */
export function validateJobEmbedding(data: unknown) {
  return JobEmbeddingSchemaRefined.parse(data);
}

export function safeValidateJobEmbedding(data: unknown) {
  return JobEmbeddingSchemaRefined.safeParse(data);
}

/**
 * Validates a JobScore with breakdown checks.
 */
export function validateJobScore(data: unknown) {
  return JobScoreSchemaRefined.parse(data);
}

export function safeValidateJobScore(data: unknown) {
  return JobScoreSchemaRefined.safeParse(data);
}
