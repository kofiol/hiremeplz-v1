import { z } from "zod";
import { UuidSchema } from "./user-profile.schema.js";

// ============================================================================
// PROFILE VERSIONING RULES
// ============================================================================
// Profile versioning is the core cache invalidation mechanism in the job engine.
// All derived data (NormalizedProfile, SearchSpec, Embeddings, Scores) are
// tagged with the profile_version they were generated from.
//
// RULES:
// 1. profile_version starts at 1 when a user profile is created
// 2. profile_version increments by 1 on ANY profile update
// 3. profile_version NEVER decrements
// 4. profile_version NEVER skips numbers
// 5. Derived data is STALE if its profile_version < user's profile_version
// 6. Stale data is hidden from UI and queued for recomputation
// 7. Old (stale) data is NEVER deleted (kept for analytics/debugging)
// ============================================================================

/**
 * Profile version number constraints
 *
 * INVARIANTS:
 * - Always positive integer
 * - Starts at 1
 * - Increments by 1
 * - Never decrements
 */
export const ProfileVersionSchema = z.number().int().positive();

export type ProfileVersion = z.infer<typeof ProfileVersionSchema>;

/**
 * Minimum valid profile version
 */
export const MIN_PROFILE_VERSION = 1 as const;

/**
 * Maximum reasonable profile version (sanity check)
 * Users shouldn't realistically hit this unless there's a bug
 */
export const MAX_PROFILE_VERSION = 1_000_000 as const;

// ============================================================================
// STALENESS CHECK
// ============================================================================

/**
 * Staleness check result
 */
export const StalenessCheckResultSchema = z.object({
  /** Whether the data is stale */
  is_stale: z.boolean(),

  /** Version of the data being checked */
  data_version: ProfileVersionSchema,

  /** Current profile version */
  current_version: ProfileVersionSchema,

  /** Version gap (how many versions behind) */
  version_gap: z.number().int().nonnegative(),

  /** Human-readable reason if stale */
  reason: z.string().nullable(),
});

export type StalenessCheckResult = z.infer<typeof StalenessCheckResultSchema>;

/**
 * Check if data is stale based on profile versions.
 *
 * RULE: Data is stale if data_version < current_version
 *
 * @param dataVersion - The profile_version the data was generated with
 * @param currentVersion - The user's current profile_version
 * @returns StalenessCheckResult with details
 *
 * @example
 * ```ts
 * const result = checkStaleness(5, 7);
 * // result.is_stale === true
 * // result.version_gap === 2
 * // result.reason === "Data version (5) is 2 versions behind current (7)"
 * ```
 */
export function checkStaleness(
  dataVersion: number,
  currentVersion: number,
): StalenessCheckResult {
  const versionGap = currentVersion - dataVersion;
  const isStale = dataVersion < currentVersion;

  return {
    is_stale: isStale,
    data_version: dataVersion,
    current_version: currentVersion,
    version_gap: Math.max(0, versionGap),
    reason: isStale
      ? `Data version (${dataVersion}) is ${versionGap} version${versionGap === 1 ? "" : "s"} behind current (${currentVersion})`
      : null,
  };
}

/**
 * Simple staleness predicate
 *
 * @param dataVersion - The profile_version the data was generated with
 * @param currentVersion - The user's current profile_version
 * @returns true if data is stale
 */
export function isStale(dataVersion: number, currentVersion: number): boolean {
  return dataVersion < currentVersion;
}

/**
 * Check if data is fresh (not stale)
 *
 * @param dataVersion - The profile_version the data was generated with
 * @param currentVersion - The user's current profile_version
 * @returns true if data is fresh
 */
export function isFresh(dataVersion: number, currentVersion: number): boolean {
  return dataVersion >= currentVersion;
}

// ============================================================================
// VERSION UPDATE VALIDATION
// ============================================================================

/**
 * Validate a profile version update.
 *
 * RULES:
 * - New version must be greater than old version
 * - Version can only increment by 1 (no gaps)
 *
 * @param oldVersion - Current profile version
 * @param newVersion - Proposed new version
 * @returns Validation result
 */
export function validateVersionUpdate(
  oldVersion: number,
  newVersion: number,
): { valid: boolean; error: string | null } {
  if (newVersion <= oldVersion) {
    return {
      valid: false,
      error: `Version cannot decrement: ${oldVersion} -> ${newVersion}`,
    };
  }

  if (newVersion !== oldVersion + 1) {
    return {
      valid: false,
      error: `Version must increment by 1: ${oldVersion} -> ${newVersion} (expected ${oldVersion + 1})`,
    };
  }

  if (newVersion > MAX_PROFILE_VERSION) {
    return {
      valid: false,
      error: `Version exceeds maximum (${MAX_PROFILE_VERSION}): ${newVersion}`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Compute the next profile version
 *
 * @param currentVersion - Current profile version
 * @returns Next version number
 */
export function getNextVersion(currentVersion: number): number {
  return currentVersion + 1;
}

// ============================================================================
// VERSIONED DATA SCHEMAS
// ============================================================================

/**
 * Base schema for any versioned data (has profile_version)
 */
export const VersionedDataSchema = z.object({
  /** Profile version this data was generated from */
  profile_version: ProfileVersionSchema,
});

export type VersionedData = z.infer<typeof VersionedDataSchema>;

/**
 * Schema for querying stale data
 */
export const StaleDataQuerySchema = z.object({
  team_id: UuidSchema,
  user_id: UuidSchema,
  /** Current user profile version */
  current_version: ProfileVersionSchema,
  /** Data type to check ("search_spec" | "embedding" | "score") */
  data_type: z.enum(["search_spec", "embedding", "score"]),
  /** Maximum number of stale items to return */
  limit: z.number().int().positive().max(1000).default(100),
});

export type StaleDataQuery = z.infer<typeof StaleDataQuerySchema>;

/**
 * Stale item result
 */
export const StaleItemSchema = z.object({
  /** Item ID */
  id: UuidSchema,
  /** Item's profile version */
  profile_version: ProfileVersionSchema,
  /** Version gap */
  version_gap: z.number().int().positive(),
  /** Created timestamp */
  created_at: z.string().datetime(),
});

export type StaleItem = z.infer<typeof StaleItemSchema>;

// ============================================================================
// RECOMPUTATION QUEUE
// ============================================================================

/**
 * Item queued for recomputation due to staleness
 */
export const RecomputeQueueItemSchema = z.object({
  /** Queue item ID */
  id: UuidSchema.optional(),

  team_id: UuidSchema,
  user_id: UuidSchema,

  /** What needs to be recomputed */
  item_type: z.enum([
    "normalized_profile",
    "search_spec",
    "profile_embedding",
    "job_scores",
  ]),

  /** Reference to the item (job_id for scores, null for profile items) */
  item_id: UuidSchema.nullable(),

  /** Profile version that triggered recomputation */
  triggered_by_version: ProfileVersionSchema,

  /** Priority (1=highest, 10=lowest) */
  priority: z.number().int().min(1).max(10).default(5),

  /** Queue status */
  status: z.enum(["pending", "processing", "completed", "failed"]).default("pending"),

  /** Error message if failed */
  error: z.string().nullable().default(null),

  /** Number of retry attempts */
  retry_count: z.number().int().nonnegative().default(0),

  /** Max retries before giving up */
  max_retries: z.number().int().positive().default(3),

  /** Timestamps */
  created_at: z.string().datetime().optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

export type RecomputeQueueItem = z.infer<typeof RecomputeQueueItemSchema>;

// ============================================================================
// PROFILE VERSION HISTORY (for debugging)
// ============================================================================

/**
 * Record of a profile version change
 */
export const ProfileVersionHistorySchema = z.object({
  id: UuidSchema.optional(),
  team_id: UuidSchema,
  user_id: UuidSchema,

  /** Old version */
  from_version: ProfileVersionSchema,

  /** New version */
  to_version: ProfileVersionSchema,

  /** What triggered the version increment */
  change_type: z.enum([
    "skill_added",
    "skill_removed",
    "skill_updated",
    "experience_added",
    "experience_removed",
    "experience_updated",
    "education_added",
    "education_removed",
    "education_updated",
    "preferences_updated",
    "profile_info_updated",
    "bulk_update",
  ]),

  /** Additional context about the change */
  change_details: z.record(z.unknown()).nullable(),

  /** When the change occurred */
  changed_at: z.string().datetime(),
});

export type ProfileVersionHistory = z.infer<typeof ProfileVersionHistorySchema>;
