// ============================================================================
// NORMALIZE PROFILE
// ============================================================================
// Deterministic transformation: UserProfile → NormalizedProfile
//
// GUARANTEES:
// - Pure function: no side effects
// - Deterministic: same input ALWAYS produces same output
// - Order-insensitive: reordering arrays in input does not change output
// - Explicit rules: every transformation is documented
// - No AI/LLM: purely algorithmic
//
// TRANSFORMATIONS:
// 1. Skills: lowercase, dedupe, alias resolution, sort by level/years
// 2. Experiences: compute duration, sort by start date, extract highlights
// 3. Education: extract graduation year, find highest degree
// 4. Seniority: threshold-based inference from total experience
// 5. Preferences: normalize and fill defaults
// ============================================================================

import type {
  UserProfile,
  UserSkill,
  UserExperience,
  UserEducation,
  NormalizedProfile,
  NormalizedSkill,
  NormalizedExperience,
  NormalizedEducation,
  NormalizedPreferences,
  Platform,
} from "../schemas/index.js";
import { toCanonicalSkillName, getSkillDisplayName } from "./skill-aliases.js";
import { inferSeniorityLevel } from "./seniority-mapping.js";

// ============================================================================
// STRING NORMALIZATION UTILITIES
// ============================================================================

/**
 * Normalizes whitespace in a string.
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces to single space
 * - Returns null for empty strings
 */
function normalizeWhitespace(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalizes a job title for keyword extraction.
 * - Lowercase
 * - Remove special characters except spaces
 * - Collapse whitespace
 */
function normalizeTitleForKeyword(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// DATE/DURATION UTILITIES
// ============================================================================

/**
 * Computes duration in months between two dates.
 *
 * RULES:
 * - If end_date is null, uses referenceDate (for current positions)
 * - If start_date is null, returns null (unknown duration)
 * - Duration is inclusive of both start and end months
 * - Minimum duration is 1 month
 *
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string or null (current position)
 * @param referenceDate - Date to use for "current" (default: now)
 * @returns Duration in months, or null if start_date is missing
 */
function computeDurationMonths(
  startDate: string | null,
  endDate: string | null,
  referenceDate: Date = new Date(),
): number | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : referenceDate;

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }

  // If end is before start, return null (invalid data)
  if (end < start) {
    return null;
  }

  // Calculate months difference
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  // Minimum 1 month (if same month, count as 1)
  return Math.max(1, months);
}

/**
 * Extracts year from a date string.
 */
function extractYear(dateString: string | null): number | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.getFullYear();
}

// ============================================================================
// SKILL NORMALIZATION
// ============================================================================

/**
 * Normalizes a single skill.
 *
 * RULES:
 * 1. Canonical name via alias dictionary
 * 2. Display name from dictionary or original
 * 3. Level preserved (1-5)
 * 4. Years preserved (null if not specified)
 */
function normalizeSkill(skill: UserSkill): NormalizedSkill {
  const canonicalName = toCanonicalSkillName(skill.name);
  const displayName = getSkillDisplayName(canonicalName);

  return {
    canonical_name: canonicalName,
    display_name: displayName,
    level: skill.level,
    years: skill.years,
  };
}

/**
 * Normalizes and deduplicates skills array.
 *
 * RULES (in order):
 * 1. Normalize each skill to canonical form
 * 2. Deduplicate by canonical_name (keep highest level, then highest years)
 * 3. Sort by: level DESC, years DESC (nulls last), canonical_name ASC
 *
 * ORDER-INSENSITIVITY: Sorting ensures same output regardless of input order.
 */
function normalizeSkills(skills: UserSkill[]): NormalizedSkill[] {
  // Step 1: Normalize all skills
  const normalized = skills.map(normalizeSkill);

  // Step 2: Deduplicate by canonical_name
  // Keep the one with highest level, then highest years
  const deduped = new Map<string, NormalizedSkill>();

  for (const skill of normalized) {
    const existing = deduped.get(skill.canonical_name);

    if (!existing) {
      deduped.set(skill.canonical_name, skill);
    } else {
      // Compare and keep best
      const shouldReplace =
        skill.level > existing.level ||
        (skill.level === existing.level &&
          (skill.years ?? -1) > (existing.years ?? -1));

      if (shouldReplace) {
        deduped.set(skill.canonical_name, skill);
      }
    }
  }

  // Step 3: Sort deterministically
  return Array.from(deduped.values()).sort((a, b) => {
    // Level DESC
    if (a.level !== b.level) return b.level - a.level;

    // Years DESC (nulls last)
    const aYears = a.years ?? -1;
    const bYears = b.years ?? -1;
    if (aYears !== bYears) return bYears - aYears;

    // Canonical name ASC (for determinism)
    return a.canonical_name.localeCompare(b.canonical_name);
  });
}

/**
 * Splits skills into primary (top 10) and secondary (rest).
 */
function splitSkills(
  skills: NormalizedSkill[],
): { primary: NormalizedSkill[]; secondary: NormalizedSkill[] } {
  return {
    primary: skills.slice(0, 10),
    secondary: skills.slice(10),
  };
}

/**
 * Extracts skill keywords (canonical names) for matching.
 */
function extractSkillKeywords(skills: NormalizedSkill[]): string[] {
  return skills.map((s) => s.canonical_name);
}

// ============================================================================
// EXPERIENCE NORMALIZATION
// ============================================================================

/**
 * Splits highlights string into array of individual highlights.
 *
 * RULES:
 * 1. Split by newlines, periods followed by space, or bullet points
 * 2. Trim each highlight
 * 3. Filter empty strings
 * 4. Limit to 10 highlights max
 */
function splitHighlights(highlights: string | null): string[] {
  if (!highlights) return [];

  return highlights
    .split(/[\n•\-]|(?<=\.)\s+/)
    .map((h) => normalizeWhitespace(h))
    .map((h) => (h ? h.replace(/\.$/, "") : h)) // Trim trailing period
    .filter((h): h is string => h !== null && h.length > 5) // Min 5 chars
    .slice(0, 10);
}

/**
 * Normalizes a single experience entry.
 *
 * @param experience - Raw experience from UserProfile
 * @param referenceDate - Date to use for "current" duration calculation
 */
function normalizeExperience(
  experience: UserExperience,
  referenceDate: Date,
): NormalizedExperience {
  const isCurrent = experience.end_date === null;
  const durationMonths = computeDurationMonths(
    experience.start_date,
    experience.end_date,
    referenceDate,
  );

  return {
    title: normalizeWhitespace(experience.title) ?? experience.title,
    company: normalizeWhitespace(experience.company),
    duration_months: durationMonths,
    is_current: isCurrent,
    highlights: splitHighlights(experience.highlights),
  };
}

/**
 * Normalizes experiences array.
 *
 * RULES:
 * 1. Normalize each experience
 * 2. Sort by start_date DESC (most recent first), then by title ASC
 *
 * ORDER-INSENSITIVITY: Sorting ensures consistent output.
 */
function normalizeExperiences(
  experiences: UserExperience[],
  referenceDate: Date,
): NormalizedExperience[] {
  // Sort experiences by start_date (descending) for determinism
  // Use a copy to avoid mutating input
  const sorted = [...experiences].sort((a, b) => {
    // Start date DESC (most recent first), nulls last
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
    if (aDate !== bDate) return bDate - aDate;

    // Title ASC for determinism
    return a.title.localeCompare(b.title);
  });

  return sorted.map((exp) => normalizeExperience(exp, referenceDate));
}

/**
 * Computes total experience in months.
 *
 * RULES:
 * - Sum of all experience durations
 * - Experiences with null duration are skipped
 * - No overlap detection (simple sum)
 */
function computeTotalExperienceMonths(experiences: NormalizedExperience[]): number {
  return experiences.reduce((total, exp) => total + (exp.duration_months ?? 0), 0);
}

/**
 * Extracts unique job title keywords.
 *
 * RULES:
 * 1. Normalize each title (lowercase, remove special chars)
 * 2. Deduplicate
 * 3. Sort alphabetically
 */
function extractTitleKeywords(experiences: NormalizedExperience[]): string[] {
  const titles = new Set<string>();

  for (const exp of experiences) {
    const normalized = normalizeTitleForKeyword(exp.title);
    if (normalized.length > 0) {
      titles.add(normalized);
    }
  }

  return Array.from(titles).sort();
}

// ============================================================================
// EDUCATION NORMALIZATION
// ============================================================================

/**
 * Degree level hierarchy for comparison.
 * Higher number = higher degree level.
 */
const DEGREE_LEVELS: Record<string, number> = {
  high_school: 1,
  ged: 1,
  associate: 2,
  bachelor: 3,
  bs: 3,
  ba: 3,
  master: 4,
  ms: 4,
  ma: 4,
  mba: 4,
  meng: 4,
  phd: 5,
  doctorate: 5,
  doctor: 5,
  md: 5,
  jd: 5,
};

/**
 * Gets the degree level for ranking purposes.
 * Returns 0 for unknown degrees.
 */
function getDegreeLevel(degree: string | null): number {
  if (!degree) return 0;

  const normalized = degree.toLowerCase().replace(/[^a-z]/g, "");

  // Check for known degree patterns
  for (const [key, level] of Object.entries(DEGREE_LEVELS)) {
    if (normalized.includes(key)) {
      return level;
    }
  }

  return 0;
}

/**
 * Normalizes a single education entry.
 */
function normalizeEducation(education: UserEducation): NormalizedEducation {
  return {
    institution: normalizeWhitespace(education.institution) ?? education.institution,
    degree: normalizeWhitespace(education.degree),
    field: normalizeWhitespace(education.field_of_study),
    graduation_year: extractYear(education.end_date),
  };
}

/**
 * Normalizes educations array and finds highest degree.
 *
 * RULES:
 * 1. Normalize each education
 * 2. Sort by graduation_year DESC, then by institution name ASC
 * 3. Determine highest degree level
 */
function normalizeEducations(educations: UserEducation[]): {
  normalized: NormalizedEducation[];
  highestDegree: string | null;
} {
  const normalized = educations.map(normalizeEducation);

  // Sort by graduation year DESC, institution ASC
  normalized.sort((a, b) => {
    const aYear = a.graduation_year ?? 0;
    const bYear = b.graduation_year ?? 0;
    if (aYear !== bYear) return bYear - aYear;
    return a.institution.localeCompare(b.institution);
  });

  // Find highest degree
  let highestDegree: string | null = null;
  let highestLevel = 0;

  for (const edu of normalized) {
    const level = getDegreeLevel(edu.degree);
    if (level > highestLevel) {
      highestLevel = level;
      highestDegree = edu.degree;
    }
  }

  return { normalized, highestDegree };
}

// ============================================================================
// PREFERENCES NORMALIZATION
// ============================================================================

/**
 * Normalizes user preferences with defaults.
 *
 * RULES:
 * 1. Platforms: dedupe and sort
 * 2. Hourly rate: preserve min/max
 * 3. Fixed budget: preserve min
 * 4. Tightness: clamp to 1-5
 * 5. Remote/contract: default to flexible/any if not specified
 */
function normalizePreferences(
  prefs: NonNullable<UserProfile["preferences"]> | null,
): NormalizedPreferences {
  if (!prefs) {
    // Return defaults
    return {
      platforms: ["linkedin", "upwork"],
      hourly_rate: { min: null, max: null, currency: "USD" },
      fixed_budget: { min: null, currency: "USD" },
      tightness: 3,
      remote_preference: "flexible",
      contract_type: "any",
    };
  }

  // Dedupe and sort platforms
  const platforms = [...new Set(prefs.platforms)].sort() as Platform[];

  return {
    platforms: platforms.length > 0 ? platforms : ["linkedin", "upwork"],
    hourly_rate: {
      min: prefs.hourly_min,
      max: prefs.hourly_max,
      currency: prefs.currency || "USD",
    },
    fixed_budget: {
      min: prefs.fixed_budget_min,
      currency: prefs.currency || "USD",
    },
    tightness: Math.max(1, Math.min(5, prefs.tightness)),
    remote_preference: "flexible", // Not in UserProfile, default to flexible
    contract_type: deriveContractType(prefs.project_types),
  };
}

/**
 * Derives contract type preference from project types.
 */
function deriveContractType(
  projectTypes: string[],
): "freelance" | "contract" | "full_time" | "part_time" | "any" {
  if (projectTypes.includes("full_time")) {
    return "full_time";
  }
  if (projectTypes.includes("long_term")) {
    return "contract";
  }
  if (projectTypes.includes("short_gig") || projectTypes.includes("medium_project")) {
    return "freelance";
  }
  return "any";
}

// ============================================================================
// MAIN NORMALIZER
// ============================================================================

/**
 * Options for profile normalization.
 */
export interface NormalizeProfileOptions {
  /**
   * Reference date for computing "current" experience duration.
   * Defaults to current date.
   * Pass a fixed date for deterministic testing.
   */
  referenceDate?: Date;

  /**
   * Timestamp for normalized_at field.
   * Defaults to current time.
   * Pass a fixed timestamp for deterministic testing.
   */
  normalizedAt?: string;
}

/**
 * Normalizes a UserProfile into a NormalizedProfile.
 *
 * This is a PURE FUNCTION with deterministic output.
 *
 * GUARANTEES:
 * - Same input → Same output (given same options)
 * - Order-insensitive for arrays (skills, experiences, educations)
 * - No side effects
 * - No external dependencies (no network, no random, no Date.now by default in tests)
 *
 * @param profile - Raw user profile from database
 * @param options - Optional configuration for testing determinism
 * @returns Normalized profile ready for downstream processing
 *
 * @example
 * const normalized = normalizeProfile(rawProfile);
 *
 * // For deterministic testing:
 * const normalized = normalizeProfile(rawProfile, {
 *   referenceDate: new Date("2026-01-21"),
 *   normalizedAt: "2026-01-21T12:00:00.000Z"
 * });
 */
export function normalizeProfile(
  profile: UserProfile,
  options: NormalizeProfileOptions = {},
): NormalizedProfile {
  const referenceDate = options.referenceDate ?? new Date();
  const normalizedAt = options.normalizedAt ?? new Date().toISOString();

  // Normalize skills
  const normalizedSkills = normalizeSkills(profile.skills);
  const { primary, secondary } = splitSkills(normalizedSkills);
  const skillKeywords = extractSkillKeywords(normalizedSkills);

  // Normalize experiences
  const normalizedExperiences = normalizeExperiences(profile.experiences, referenceDate);
  const totalExperienceMonths = computeTotalExperienceMonths(normalizedExperiences);
  const titleKeywords = extractTitleKeywords(normalizedExperiences);

  // Infer seniority from total experience
  const inferredSeniority = inferSeniorityLevel(totalExperienceMonths);

  // Normalize educations
  const { normalized: normalizedEducations, highestDegree } = normalizeEducations(
    profile.educations,
  );

  // Normalize preferences
  const normalizedPreferences = normalizePreferences(profile.preferences);

  return {
    // Identity (preserved)
    user_id: profile.user_id,
    team_id: profile.team_id,

    // Versioning (preserved)
    profile_version: profile.profile_version,

    // Basic info (normalized)
    display_name: normalizeWhitespace(profile.display_name),
    timezone: profile.timezone,

    // Experience metrics (computed)
    total_experience_months: totalExperienceMonths,
    inferred_seniority: inferredSeniority,

    // Skills (normalized, deduplicated, sorted)
    primary_skills: primary,
    secondary_skills: secondary,
    skill_keywords: skillKeywords,

    // Experiences (normalized, sorted)
    experiences: normalizedExperiences,
    title_keywords: titleKeywords,

    // Education (normalized, sorted)
    educations: normalizedEducations,
    highest_degree: highestDegree,

    // Preferences (normalized with defaults)
    preferences: normalizedPreferences,

    // Metadata
    normalized_at: normalizedAt,
  };
}
