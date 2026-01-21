// ============================================================================
// SENIORITY MAPPING
// ============================================================================
// Deterministic mapping from experience months to seniority level.
// NO AI, NO heuristics - pure threshold-based rules.
//
// THRESHOLDS (in months):
// - entry:     0   - 23   (0-2 years)
// - junior:    24  - 47   (2-4 years)
// - mid:       48  - 71   (4-6 years)
// - senior:    72  - 119  (6-10 years)
// - lead:      120 - 179  (10-15 years)
// - principal: 180+       (15+ years)
//
// RATIONALE:
// - Industry standard career progression timeline
// - Ranges are non-overlapping and exhaustive
// - Based on typical IC (Individual Contributor) track
// ============================================================================

import type { SeniorityLevel } from "../schemas/index.js";

/**
 * Seniority threshold configuration.
 * Each entry defines: [minMonths, maxMonths (exclusive), seniorityLevel]
 *
 * INVARIANTS:
 * - Thresholds are sorted by minMonths ascending
 * - Ranges are contiguous and non-overlapping
 * - Last entry has maxMonths = Infinity
 */
export const SENIORITY_THRESHOLDS: ReadonlyArray<{
  readonly minMonths: number;
  readonly maxMonths: number;
  readonly level: SeniorityLevel;
  readonly description: string;
}> = [
  {
    minMonths: 0,
    maxMonths: 24,
    level: "entry",
    description: "0-2 years: Entry level, learning fundamentals",
  },
  {
    minMonths: 24,
    maxMonths: 48,
    level: "junior",
    description: "2-4 years: Junior level, gaining independence",
  },
  {
    minMonths: 48,
    maxMonths: 72,
    level: "mid",
    description: "4-6 years: Mid level, solid contributor",
  },
  {
    minMonths: 72,
    maxMonths: 120,
    level: "senior",
    description: "6-10 years: Senior level, technical leadership",
  },
  {
    minMonths: 120,
    maxMonths: 180,
    level: "lead",
    description: "10-15 years: Lead level, team/project leadership",
  },
  {
    minMonths: 180,
    maxMonths: Infinity,
    level: "principal",
    description: "15+ years: Principal level, org-wide impact",
  },
] as const;

/**
 * Maps total experience months to a seniority level.
 *
 * RULES:
 * 1. Input is clamped to non-negative
 * 2. Thresholds are checked in order (already sorted by minMonths)
 * 3. Returns the level where minMonths <= months < maxMonths
 *
 * @param totalMonths - Total professional experience in months
 * @returns The corresponding seniority level
 *
 * @example
 * inferSeniorityLevel(0)   // "entry"
 * inferSeniorityLevel(23)  // "entry"
 * inferSeniorityLevel(24)  // "junior"
 * inferSeniorityLevel(60)  // "mid"
 * inferSeniorityLevel(100) // "senior"
 * inferSeniorityLevel(150) // "lead"
 * inferSeniorityLevel(200) // "principal"
 */
export function inferSeniorityLevel(totalMonths: number): SeniorityLevel {
  // Clamp to non-negative, handle NaN
  let months = Math.max(0, Math.floor(totalMonths));
  if (isNaN(months)) months = 0;

  // Find the matching threshold
  for (const threshold of SENIORITY_THRESHOLDS) {
    if (months >= threshold.minMonths && months < threshold.maxMonths) {
      return threshold.level;
    }
  }

  // Fallback (should never reach due to Infinity in last threshold)
  return "principal";
}

/**
 * Gets the threshold configuration for a given seniority level.
 */
export function getSeniorityThreshold(level: SeniorityLevel): {
  minMonths: number;
  maxMonths: number;
  description: string;
} {
  const threshold = SENIORITY_THRESHOLDS.find((t) => t.level === level);
  if (!threshold) {
    throw new Error(`Unknown seniority level: ${level}`);
  }
  return {
    minMonths: threshold.minMonths,
    maxMonths: threshold.maxMonths,
    description: threshold.description,
  };
}

/**
 * Converts months to years with one decimal place.
 * Used for display purposes.
 */
export function monthsToYears(months: number): number {
  return Math.round((months / 12) * 10) / 10;
}

/**
 * Converts years to months (integer).
 */
export function yearsToMonths(years: number): number {
  return Math.floor(years * 12);
}
