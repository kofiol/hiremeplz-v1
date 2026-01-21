import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NormalizedProfile, SearchSpec } from "../../../schemas/index.js";
import { SearchSpecSchema } from "../../../schemas/index.js";
import { SearchSpecCache, InMemorySearchSpecCache } from "../cache.js";
import { SEARCH_SPEC_SYSTEM_PROMPT, formatUserMessage } from "../prompt.js";

// ============================================================================
// NOTE: These tests mock the OpenAI agent to avoid API calls.
// Integration tests with real API should be in a separate file.
// ============================================================================

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestProfile(
  profileVersion: number = 1,
): NormalizedProfile {
  return {
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    team_id: "660e8400-e29b-41d4-a716-446655440001",
    profile_version: profileVersion,
    display_name: "Jane Developer",
    timezone: "America/New_York",
    total_experience_months: 67,
    inferred_seniority: "mid",
    primary_skills: [
      {
        canonical_name: "typescript",
        display_name: "TypeScript",
        level: 5,
        years: 4,
      },
      {
        canonical_name: "react",
        display_name: "React",
        level: 4,
        years: 3,
      },
      {
        canonical_name: "nodejs",
        display_name: "Node.js",
        level: 4,
        years: 5,
      },
    ],
    secondary_skills: [
      {
        canonical_name: "postgresql",
        display_name: "PostgreSQL",
        level: 3,
        years: 2,
      },
    ],
    skill_keywords: ["typescript", "react", "nodejs", "postgresql"],
    experiences: [
      {
        title: "Senior Full Stack Developer",
        company: "TechCorp",
        duration_months: 35,
        is_current: true,
        highlights: ["Led team of 5", "Built microservices"],
      },
    ],
    title_keywords: ["senior full stack developer"],
    educations: [
      {
        institution: "MIT",
        degree: "Bachelor of Science",
        field: "Computer Science",
        graduation_year: 2016,
      },
    ],
    highest_degree: "Bachelor of Science",
    preferences: {
      platforms: ["linkedin", "upwork"],
      hourly_rate: { min: 75, max: 150, currency: "USD" },
      fixed_budget: { min: 5000, currency: "USD" },
      tightness: 3,
      remote_preference: "flexible",
      contract_type: "freelance",
    },
    normalized_at: "2026-01-21T12:00:00.000Z",
  };
}

function createMockSearchSpec(profile: NormalizedProfile): SearchSpec {
  return {
    user_id: profile.user_id,
    team_id: profile.team_id,
    profile_version: profile.profile_version,
    title_keywords: [
      { keyword: "Full Stack Developer", weight: 10 },
      { keyword: "Senior Software Engineer", weight: 8 },
    ],
    skill_keywords: [
      { keyword: "typescript", weight: 10 },
      { keyword: "react", weight: 9 },
      { keyword: "nodejs", weight: 8 },
    ],
    negative_keywords: ["unpaid", "internship"],
    locations: [],
    seniority_levels: ["mid", "senior"],
    remote_preference: "flexible",
    contract_types: ["freelance", "contract"],
    platforms: ["linkedin", "upwork"],
    hourly_min: 75,
    hourly_max: 150,
    fixed_budget_min: 5000,
    max_results_per_platform: 100,
    generated_at: "2026-01-21T12:00:00.000Z",
  };
}

// ============================================================================
// PROMPT TESTS
// ============================================================================

describe("SearchSpec Prompt", () => {
  describe("SEARCH_SPEC_SYSTEM_PROMPT", () => {
    it("is a non-empty string", () => {
      expect(typeof SEARCH_SPEC_SYSTEM_PROMPT).toBe("string");
      expect(SEARCH_SPEC_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it("contains key instructions", () => {
      expect(SEARCH_SPEC_SYSTEM_PROMPT).toContain("title_keywords");
      expect(SEARCH_SPEC_SYSTEM_PROMPT).toContain("skill_keywords");
      expect(SEARCH_SPEC_SYSTEM_PROMPT).toContain("negative_keywords");
      expect(SEARCH_SPEC_SYSTEM_PROMPT).toContain("seniority");
      expect(SEARCH_SPEC_SYSTEM_PROMPT).toContain("JSON");
    });

    it("specifies strict JSON output", () => {
      expect(SEARCH_SPEC_SYSTEM_PROMPT.toLowerCase()).toContain("strict json");
    });
  });

  describe("formatUserMessage", () => {
    it("wraps profile JSON in message", () => {
      const profileJson = JSON.stringify({ test: "data" });
      const message = formatUserMessage(profileJson);

      expect(message).toContain(profileJson);
      expect(message).toContain("Generate search specification");
    });

    it("preserves profile JSON exactly", () => {
      const profile = createTestProfile();
      const profileJson = JSON.stringify(profile, null, 2);
      const message = formatUserMessage(profileJson);

      expect(message).toContain(profileJson);
    });
  });
});

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe("SearchSpec Schema Validation", () => {
  it("validates a complete SearchSpec", () => {
    const profile = createTestProfile();
    const spec = createMockSearchSpec(profile);

    const result = SearchSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it("validates profile_version is preserved", () => {
    const profile = createTestProfile(42);
    const spec = createMockSearchSpec(profile);

    const result = SearchSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile_version).toBe(42);
    }
  });

  it("validates user_id and team_id are preserved", () => {
    const profile = createTestProfile();
    const spec = createMockSearchSpec(profile);

    const result = SearchSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user_id).toBe(profile.user_id);
      expect(result.data.team_id).toBe(profile.team_id);
    }
  });
});

// ============================================================================
// CACHE BEHAVIOR TESTS (Unit Tests - No API calls)
// ============================================================================

describe("SearchSpecAgent Cache Behavior (Unit)", () => {
  let storage: InMemorySearchSpecCache;
  let cache: SearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
    cache = new SearchSpecCache(storage);
  });

  it("caches by profile_version", async () => {
    const profile = createTestProfile(5);
    const spec = createMockSearchSpec(profile);

    await cache.set(spec);

    // Same version = hit
    const result = await cache.get(profile.user_id, 5);
    expect(result).toEqual(spec);

    // Different version = miss
    const miss = await cache.get(profile.user_id, 6);
    expect(miss).toBeNull();
  });

  it("returns cached spec immediately on hit", async () => {
    const profile = createTestProfile(3);
    const spec = createMockSearchSpec(profile);

    await cache.set(spec);

    // Multiple gets should all return the same cached value
    const results = await Promise.all([
      cache.get(profile.user_id, 3),
      cache.get(profile.user_id, 3),
      cache.get(profile.user_id, 3),
    ]);

    expect(results[0]).toEqual(spec);
    expect(results[1]).toEqual(spec);
    expect(results[2]).toEqual(spec);
  });

  it("cache miss when profile_version increments", async () => {
    const profileV1 = createTestProfile(1);
    const specV1 = createMockSearchSpec(profileV1);

    await cache.set(specV1);

    // V1 cached
    expect(await cache.has(profileV1.user_id, 1)).toBe(true);

    // V2 not cached (profile was updated)
    expect(await cache.has(profileV1.user_id, 2)).toBe(false);
  });

  it("different users have separate cache entries", async () => {
    const profile1 = createTestProfile(1);
    const profile2 = {
      ...createTestProfile(1),
      user_id: "660e8400-e29b-41d4-a716-446655440099",
    };

    const spec1 = createMockSearchSpec(profile1);
    const spec2 = createMockSearchSpec(profile2);

    await cache.set(spec1);
    await cache.set(spec2);

    const result1 = await cache.get(profile1.user_id, 1);
    const result2 = await cache.get(profile2.user_id, 1);

    expect(result1?.user_id).toBe(profile1.user_id);
    expect(result2?.user_id).toBe(profile2.user_id);
    expect(result1?.user_id).not.toBe(result2?.user_id);
  });
});

// ============================================================================
// IDEMPOTENCE TESTS
// ============================================================================

describe("Idempotence per profile_version", () => {
  let storage: InMemorySearchSpecCache;
  let cache: SearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
    cache = new SearchSpecCache(storage);
  });

  it("same profile_version returns same cached result", async () => {
    const profile = createTestProfile(7);
    const spec = createMockSearchSpec(profile);

    await cache.set(spec);

    // Multiple retrievals should be identical
    const results: (SearchSpec | null)[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(await cache.get(profile.user_id, 7));
    }

    // All results should be equal
    for (const result of results) {
      expect(result).toEqual(spec);
    }
  });

  it("profile_version change invalidates cache (conceptually)", async () => {
    const profile = createTestProfile(1);
    const spec = createMockSearchSpec(profile);

    await cache.set(spec);

    // Simulate profile update (version increment)
    const newVersion = 2;

    // Old version still cached (for historical reference)
    expect(await cache.get(profile.user_id, 1)).toEqual(spec);

    // New version not cached (needs generation)
    expect(await cache.get(profile.user_id, newVersion)).toBeNull();
  });

  it("re-setting same spec is idempotent", async () => {
    const profile = createTestProfile(5);
    const spec = createMockSearchSpec(profile);

    // Set multiple times
    await cache.set(spec);
    await cache.set(spec);
    await cache.set(spec);

    // Should only have one entry
    expect(storage.size()).toBe(1);

    // Should return the spec
    expect(await cache.get(profile.user_id, 5)).toEqual(spec);
  });
});

// ============================================================================
// RETRY SAFETY TESTS
// ============================================================================

describe("Retry Safety", () => {
  let storage: InMemorySearchSpecCache;
  let cache: SearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
    cache = new SearchSpecCache(storage);
  });

  it("concurrent cache operations are safe", async () => {
    const profile = createTestProfile(1);
    const spec = createMockSearchSpec(profile);

    // Simulate concurrent sets (retry scenario)
    await Promise.all([
      cache.set(spec),
      cache.set(spec),
      cache.set(spec),
    ]);

    // Should have exactly one entry
    expect(storage.size()).toBe(1);

    // Should return the spec
    const result = await cache.get(profile.user_id, 1);
    expect(result).toEqual(spec);
  });

  it("get during set returns consistent result", async () => {
    const profile = createTestProfile(1);
    const spec = createMockSearchSpec(profile);

    // Concurrent set and gets
    const [, r1, r2, r3] = await Promise.all([
      cache.set(spec),
      cache.get(profile.user_id, 1),
      cache.get(profile.user_id, 1),
      cache.get(profile.user_id, 1),
    ]);

    // Some may be null (set not complete), some may have spec
    // But none should have corrupted data
    for (const result of [r1, r2, r3]) {
      if (result !== null) {
        expect(result).toEqual(spec);
      }
    }
  });
});
