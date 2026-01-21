import { describe, it, expect } from "vitest";
import {
  UserProfileSchema,
  NormalizedProfileSchema,
  SearchSpecSchema,
  SearchSpecSchemaRefined,
  RawJobSchema,
  LinkedInRawJobSchema,
  UpworkRawJobSchema,
  NormalizedJobSchema,
  JobEmbeddingSchema,
  JobEmbeddingSchemaRefined,
  JobScoreSchema,
  checkStaleness,
  isStale,
  isFresh,
  validateVersionUpdate,
  getNextVersion,
  EMBEDDING_DIMENSIONS,
} from "../index.js";

import {
  // Valid examples
  VALID_USER_PROFILE,
  VALID_USER_PROFILE_MINIMAL,
  VALID_NORMALIZED_PROFILE,
  VALID_SEARCH_SPEC,
  VALID_LINKEDIN_RAW_JOB,
  VALID_UPWORK_RAW_JOB,
  VALID_NORMALIZED_JOB,
  VALID_JOB_EMBEDDING,
  VALID_JOB_SCORE,
  // Invalid examples
  INVALID_USER_PROFILE_ZERO_VERSION,
  INVALID_USER_PROFILE_NEGATIVE_VERSION,
  INVALID_USER_PROFILE_BAD_SKILL,
  INVALID_USER_PROFILE_BAD_UUID,
  INVALID_NORMALIZED_PROFILE_VERSION_ZERO,
  INVALID_NORMALIZED_PROFILE_BAD_SENIORITY,
  INVALID_SEARCH_SPEC_NO_TITLES,
  INVALID_SEARCH_SPEC_NO_SKILLS,
  INVALID_SEARCH_SPEC_BAD_RATE,
  INVALID_RAW_JOB_NO_ID,
  INVALID_RAW_JOB_NO_TITLE,
  INVALID_NORMALIZED_JOB_BAD_HASH,
  INVALID_NORMALIZED_JOB_NO_TITLE,
  INVALID_NORMALIZED_JOB_BAD_URL,
  INVALID_JOB_EMBEDDING_DIMENSION_MISMATCH,
  INVALID_JOB_SCORE_OUT_OF_RANGE,
  INVALID_JOB_SCORE_BAD_TIGHTNESS,
  INVALID_JOB_SCORE_ZERO_VERSION,
  INVALID_JOB_SCORE_TOO_MANY_REASONS,
} from "./examples.js";

// ============================================================================
// USER PROFILE TESTS
// ============================================================================

describe("UserProfileSchema", () => {
  describe("valid examples", () => {
    it("accepts a complete user profile", () => {
      const result = UserProfileSchema.safeParse(VALID_USER_PROFILE);
      expect(result.success).toBe(true);
    });

    it("accepts a minimal user profile", () => {
      const result = UserProfileSchema.safeParse(VALID_USER_PROFILE_MINIMAL);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid examples", () => {
    it("rejects profile_version = 0", () => {
      const result = UserProfileSchema.safeParse(INVALID_USER_PROFILE_ZERO_VERSION);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("profile_version");
      }
    });

    it("rejects negative profile_version", () => {
      const result = UserProfileSchema.safeParse(INVALID_USER_PROFILE_NEGATIVE_VERSION);
      expect(result.success).toBe(false);
    });

    it("rejects skill level > 5", () => {
      const result = UserProfileSchema.safeParse(INVALID_USER_PROFILE_BAD_SKILL);
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID format", () => {
      const result = UserProfileSchema.safeParse(INVALID_USER_PROFILE_BAD_UUID);
      expect(result.success).toBe(false);
    });
  });

  describe("invariants", () => {
    it("profile_version must be positive integer", () => {
      const validVersions = [1, 2, 100, 999];
      const invalidVersions = [0, -1, 1.5, NaN];

      for (const v of validVersions) {
        const profile = { ...VALID_USER_PROFILE_MINIMAL, profile_version: v };
        expect(UserProfileSchema.safeParse(profile).success).toBe(true);
      }

      for (const v of invalidVersions) {
        const profile = { ...VALID_USER_PROFILE_MINIMAL, profile_version: v };
        expect(UserProfileSchema.safeParse(profile).success).toBe(false);
      }
    });
  });
});

// ============================================================================
// NORMALIZED PROFILE TESTS
// ============================================================================

describe("NormalizedProfileSchema", () => {
  describe("valid examples", () => {
    it("accepts a complete normalized profile", () => {
      const result = NormalizedProfileSchema.safeParse(VALID_NORMALIZED_PROFILE);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid examples", () => {
    it("rejects profile_version = 0", () => {
      const result = NormalizedProfileSchema.safeParse(INVALID_NORMALIZED_PROFILE_VERSION_ZERO);
      expect(result.success).toBe(false);
    });

    it("rejects invalid seniority enum", () => {
      const result = NormalizedProfileSchema.safeParse(INVALID_NORMALIZED_PROFILE_BAD_SENIORITY);
      expect(result.success).toBe(false);
    });
  });

  describe("invariants", () => {
    it("inferred_seniority must match total_experience_months ranges", () => {
      // This is a documentation test - actual implementation would enforce this
      const seniorityRanges = {
        entry: { min: 0, max: 24 },
        junior: { min: 24, max: 48 },
        mid: { min: 48, max: 72 },
        senior: { min: 72, max: 120 },
        lead: { min: 120, max: 180 },
        principal: { min: 180, max: Infinity },
      };

      // With 67 months experience, should be "mid" (48-72 range)
      expect(VALID_NORMALIZED_PROFILE.total_experience_months).toBe(67);
      expect(VALID_NORMALIZED_PROFILE.inferred_seniority).toBe("mid");
      expect(seniorityRanges.mid.min <= 67 && 67 < seniorityRanges.mid.max).toBe(true);
    });
  });
});

// ============================================================================
// SEARCH SPEC TESTS
// ============================================================================

describe("SearchSpecSchema", () => {
  describe("valid examples", () => {
    it("accepts a complete search spec", () => {
      const result = SearchSpecSchema.safeParse(VALID_SEARCH_SPEC);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid examples", () => {
    it("rejects empty title_keywords array", () => {
      const result = SearchSpecSchema.safeParse(INVALID_SEARCH_SPEC_NO_TITLES);
      expect(result.success).toBe(false);
    });

    it("rejects empty skill_keywords array", () => {
      const result = SearchSpecSchema.safeParse(INVALID_SEARCH_SPEC_NO_SKILLS);
      expect(result.success).toBe(false);
    });
  });

  describe("refinements", () => {
    it("rejects hourly_min > hourly_max via refined schema", () => {
      const result = SearchSpecSchemaRefined.safeParse(INVALID_SEARCH_SPEC_BAD_RATE);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// RAW JOB TESTS
// ============================================================================

describe("RawJobSchema", () => {
  describe("LinkedIn raw jobs", () => {
    it("accepts a valid LinkedIn raw job", () => {
      const result = LinkedInRawJobSchema.safeParse(VALID_LINKEDIN_RAW_JOB);
      expect(result.success).toBe(true);
    });

    it("preserves unknown fields (passthrough)", () => {
      const jobWithExtra = {
        ...VALID_LINKEDIN_RAW_JOB,
        custom_field: "preserved",
        another_field: 123,
      };
      const result = LinkedInRawJobSchema.safeParse(jobWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).custom_field).toBe("preserved");
      }
    });
  });

  describe("Upwork raw jobs", () => {
    it("accepts a valid Upwork raw job", () => {
      const result = UpworkRawJobSchema.safeParse(VALID_UPWORK_RAW_JOB);
      expect(result.success).toBe(true);
    });
  });

  describe("generic raw jobs", () => {
    it("rejects job without id", () => {
      const result = RawJobSchema.safeParse(INVALID_RAW_JOB_NO_ID);
      expect(result.success).toBe(false);
    });

    it("rejects job without title", () => {
      const result = RawJobSchema.safeParse(INVALID_RAW_JOB_NO_TITLE);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// NORMALIZED JOB TESTS
// ============================================================================

describe("NormalizedJobSchema", () => {
  describe("valid examples", () => {
    it("accepts a complete normalized job", () => {
      const result = NormalizedJobSchema.safeParse(VALID_NORMALIZED_JOB);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid examples", () => {
    it("rejects canonical_hash with wrong length", () => {
      const result = NormalizedJobSchema.safeParse(INVALID_NORMALIZED_JOB_BAD_HASH);
      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = NormalizedJobSchema.safeParse(INVALID_NORMALIZED_JOB_NO_TITLE);
      expect(result.success).toBe(false);
    });

    it("rejects invalid apply_url", () => {
      const result = NormalizedJobSchema.safeParse(INVALID_NORMALIZED_JOB_BAD_URL);
      expect(result.success).toBe(false);
    });
  });

  describe("invariants", () => {
    it("canonical_hash must be 64 characters (SHA-256 hex)", () => {
      expect(VALID_NORMALIZED_JOB.canonical_hash.length).toBe(64);
    });

    it("skills array should be sorted alphabetically", () => {
      const skills = [...VALID_NORMALIZED_JOB.skills];
      const sorted = [...skills].sort();
      expect(skills).toEqual(sorted);
    });
  });
});

// ============================================================================
// JOB EMBEDDING TESTS
// ============================================================================

describe("JobEmbeddingSchema", () => {
  describe("valid examples", () => {
    it("accepts a valid job embedding", () => {
      const result = JobEmbeddingSchema.safeParse(VALID_JOB_EMBEDDING);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid examples", () => {
    it("basic schema accepts dimension mismatch (refinement catches it)", () => {
      // Basic schema doesn't validate dimension consistency
      const result = JobEmbeddingSchema.safeParse(INVALID_JOB_EMBEDDING_DIMENSION_MISMATCH);
      expect(result.success).toBe(true); // Basic passes

      // Refined schema catches it
      const refinedResult = JobEmbeddingSchemaRefined.safeParse(INVALID_JOB_EMBEDDING_DIMENSION_MISMATCH);
      expect(refinedResult.success).toBe(false);
    });
  });

  describe("invariants", () => {
    it("embedding dimension matches EMBEDDING_DIMENSIONS constant", () => {
      const model = VALID_JOB_EMBEDDING.embedding_model;
      const expectedDim = EMBEDDING_DIMENSIONS[model];
      expect(VALID_JOB_EMBEDDING.dimension).toBe(expectedDim);
      expect(VALID_JOB_EMBEDDING.embedding.length).toBe(expectedDim);
    });
  });
});

// ============================================================================
// JOB SCORE TESTS
// ============================================================================

describe("JobScoreSchema", () => {
  describe("valid examples", () => {
    it("accepts a valid job score", () => {
      const result = JobScoreSchema.safeParse(VALID_JOB_SCORE);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid examples", () => {
    it("rejects score > 100", () => {
      const result = JobScoreSchema.safeParse(INVALID_JOB_SCORE_OUT_OF_RANGE);
      expect(result.success).toBe(false);
    });

    it("rejects tightness > 5", () => {
      const result = JobScoreSchema.safeParse(INVALID_JOB_SCORE_BAD_TIGHTNESS);
      expect(result.success).toBe(false);
    });

    it("rejects profile_version = 0", () => {
      const result = JobScoreSchema.safeParse(INVALID_JOB_SCORE_ZERO_VERSION);
      expect(result.success).toBe(false);
    });

    it("rejects more than 5 reasoning points", () => {
      const result = JobScoreSchema.safeParse(INVALID_JOB_SCORE_TOO_MANY_REASONS);
      expect(result.success).toBe(false);
    });
  });

  describe("invariants", () => {
    it("score must be 0-100", () => {
      const validScores = [0, 50, 100];
      const invalidScores = [-1, 101, 150];

      for (const s of validScores) {
        const score = { ...VALID_JOB_SCORE, score: s };
        expect(JobScoreSchema.safeParse(score).success).toBe(true);
      }

      for (const s of invalidScores) {
        const score = { ...VALID_JOB_SCORE, score: s };
        expect(JobScoreSchema.safeParse(score).success).toBe(false);
      }
    });

    it("tightness must be 1-5", () => {
      const validTightness = [1, 2, 3, 4, 5];
      const invalidTightness = [0, 6, 10];

      for (const t of validTightness) {
        const score = { ...VALID_JOB_SCORE, tightness: t };
        expect(JobScoreSchema.safeParse(score).success).toBe(true);
      }

      for (const t of invalidTightness) {
        const score = { ...VALID_JOB_SCORE, tightness: t };
        expect(JobScoreSchema.safeParse(score).success).toBe(false);
      }
    });
  });
});

// ============================================================================
// VERSIONING HELPERS TESTS
// ============================================================================

describe("Versioning Helpers", () => {
  describe("checkStaleness", () => {
    it("detects stale data correctly", () => {
      const result = checkStaleness(3, 5);
      expect(result.is_stale).toBe(true);
      expect(result.version_gap).toBe(2);
      expect(result.data_version).toBe(3);
      expect(result.current_version).toBe(5);
    });

    it("detects fresh data correctly", () => {
      const result = checkStaleness(5, 5);
      expect(result.is_stale).toBe(false);
      expect(result.version_gap).toBe(0);
      expect(result.reason).toBe(null);
    });

    it("handles data ahead of current (edge case)", () => {
      const result = checkStaleness(6, 5);
      expect(result.is_stale).toBe(false);
      expect(result.version_gap).toBe(0);
    });
  });

  describe("isStale / isFresh", () => {
    it("isStale returns true when data_version < current_version", () => {
      expect(isStale(3, 5)).toBe(true);
      expect(isStale(5, 5)).toBe(false);
      expect(isStale(6, 5)).toBe(false);
    });

    it("isFresh returns true when data_version >= current_version", () => {
      expect(isFresh(3, 5)).toBe(false);
      expect(isFresh(5, 5)).toBe(true);
      expect(isFresh(6, 5)).toBe(true);
    });
  });

  describe("validateVersionUpdate", () => {
    it("accepts valid increment by 1", () => {
      const result = validateVersionUpdate(5, 6);
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it("rejects decrement", () => {
      const result = validateVersionUpdate(5, 4);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot decrement");
    });

    it("rejects same version", () => {
      const result = validateVersionUpdate(5, 5);
      expect(result.valid).toBe(false);
    });

    it("rejects gaps (increment by more than 1)", () => {
      const result = validateVersionUpdate(5, 7);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("increment by 1");
    });
  });

  describe("getNextVersion", () => {
    it("returns current + 1", () => {
      expect(getNextVersion(1)).toBe(2);
      expect(getNextVersion(5)).toBe(6);
      expect(getNextVersion(999)).toBe(1000);
    });
  });
});
