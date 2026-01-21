import { describe, it, expect, beforeEach } from "vitest";
import {
  SearchSpecCache,
  InMemorySearchSpecCache,
  checkCache,
} from "../cache.js";
import type { SearchSpec } from "../../../schemas/index.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestSearchSpec(
  userId: string,
  profileVersion: number,
): SearchSpec {
  return {
    user_id: userId,
    team_id: "660e8400-e29b-41d4-a716-446655440001",
    profile_version: profileVersion,
    title_keywords: [{ keyword: "Developer", weight: 5 }],
    skill_keywords: [{ keyword: "typescript", weight: 5 }],
    negative_keywords: [],
    locations: [],
    seniority_levels: ["mid"],
    remote_preference: "flexible",
    contract_types: ["freelance"],
    platforms: ["linkedin"],
    hourly_min: null,
    hourly_max: null,
    fixed_budget_min: null,
    max_results_per_platform: 100,
    generated_at: "2026-01-21T12:00:00.000Z",
  };
}

const USER_ID_1 = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID_2 = "550e8400-e29b-41d4-a716-446655440001";

// ============================================================================
// IN-MEMORY CACHE TESTS
// ============================================================================

describe("InMemorySearchSpecCache", () => {
  let storage: InMemorySearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
  });

  describe("basic operations", () => {
    it("returns null for missing key", async () => {
      const result = await storage.get("nonexistent");
      expect(result).toBeNull();
    });

    it("stores and retrieves value", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await storage.set("test-key", spec);

      const result = await storage.get("test-key");
      expect(result).toEqual(spec);
    });

    it("deletes value", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await storage.set("test-key", spec);
      await storage.delete("test-key");

      const result = await storage.get("test-key");
      expect(result).toBeNull();
    });

    it("clears all entries", async () => {
      await storage.set("key1", createTestSearchSpec(USER_ID_1, 1));
      await storage.set("key2", createTestSearchSpec(USER_ID_2, 1));

      expect(storage.size()).toBe(2);

      storage.clear();

      expect(storage.size()).toBe(0);
    });
  });

  describe("TTL expiration", () => {
    it("returns value before TTL expires", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await storage.set("test-key", spec, 10); // 10 seconds TTL

      const result = await storage.get("test-key");
      expect(result).toEqual(spec);
    });

    it("returns null after TTL expires", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      // Set with 0 TTL (immediately expired)
      await storage.set("test-key", spec, 0);

      // Wait a tiny bit for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await storage.get("test-key");
      expect(result).toBeNull();
    });

    it("stores without TTL (never expires)", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await storage.set("test-key", spec); // No TTL

      const result = await storage.get("test-key");
      expect(result).toEqual(spec);
    });
  });
});

// ============================================================================
// SEARCH SPEC CACHE TESTS
// ============================================================================

describe("SearchSpecCache", () => {
  let storage: InMemorySearchSpecCache;
  let cache: SearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
    cache = new SearchSpecCache(storage);
  });

  describe("getCacheKey", () => {
    it("generates correct key format", () => {
      const key = SearchSpecCache.getCacheKey(USER_ID_1, 5);
      expect(key).toBe(`search_spec:${USER_ID_1}:v5`);
    });

    it("generates different keys for different users", () => {
      const key1 = SearchSpecCache.getCacheKey(USER_ID_1, 1);
      const key2 = SearchSpecCache.getCacheKey(USER_ID_2, 1);
      expect(key1).not.toBe(key2);
    });

    it("generates different keys for different versions", () => {
      const key1 = SearchSpecCache.getCacheKey(USER_ID_1, 1);
      const key2 = SearchSpecCache.getCacheKey(USER_ID_1, 2);
      expect(key1).not.toBe(key2);
    });
  });

  describe("cache hit/miss", () => {
    it("returns null on cache miss", async () => {
      const result = await cache.get(USER_ID_1, 1);
      expect(result).toBeNull();
    });

    it("returns spec on cache hit", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 3);
      await cache.set(spec);

      const result = await cache.get(USER_ID_1, 3);
      expect(result).toEqual(spec);
    });

    it("cache miss when profile_version changes", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await cache.set(spec);

      // Same user, different version = miss
      const result = await cache.get(USER_ID_1, 2);
      expect(result).toBeNull();
    });

    it("cache miss for different user", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await cache.set(spec);

      // Different user, same version = miss
      const result = await cache.get(USER_ID_2, 1);
      expect(result).toBeNull();
    });
  });

  describe("has()", () => {
    it("returns false when not cached", async () => {
      const result = await cache.has(USER_ID_1, 1);
      expect(result).toBe(false);
    });

    it("returns true when cached", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await cache.set(spec);

      const result = await cache.has(USER_ID_1, 1);
      expect(result).toBe(true);
    });
  });

  describe("invalidate()", () => {
    it("removes cached entry", async () => {
      const spec = createTestSearchSpec(USER_ID_1, 1);
      await cache.set(spec);

      expect(await cache.has(USER_ID_1, 1)).toBe(true);

      await cache.invalidate(USER_ID_1, 1);

      expect(await cache.has(USER_ID_1, 1)).toBe(false);
    });

    it("does not affect other entries", async () => {
      await cache.set(createTestSearchSpec(USER_ID_1, 1));
      await cache.set(createTestSearchSpec(USER_ID_1, 2));
      await cache.set(createTestSearchSpec(USER_ID_2, 1));

      await cache.invalidate(USER_ID_1, 1);

      expect(await cache.has(USER_ID_1, 1)).toBe(false);
      expect(await cache.has(USER_ID_1, 2)).toBe(true);
      expect(await cache.has(USER_ID_2, 1)).toBe(true);
    });
  });

  describe("version-based invalidation", () => {
    it("naturally invalidates when version increments", async () => {
      // Cache spec for version 1
      const specV1 = createTestSearchSpec(USER_ID_1, 1);
      await cache.set(specV1);

      // Version 1 is cached
      expect(await cache.get(USER_ID_1, 1)).toEqual(specV1);

      // Version 2 is NOT cached (natural invalidation)
      expect(await cache.get(USER_ID_1, 2)).toBeNull();

      // Cache spec for version 2
      const specV2 = createTestSearchSpec(USER_ID_1, 2);
      await cache.set(specV2);

      // Both versions now cached independently
      expect(await cache.get(USER_ID_1, 1)).toEqual(specV1);
      expect(await cache.get(USER_ID_1, 2)).toEqual(specV2);
    });
  });
});

// ============================================================================
// CHECK CACHE HELPER TESTS
// ============================================================================

describe("checkCache", () => {
  let storage: InMemorySearchSpecCache;
  let cache: SearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
    cache = new SearchSpecCache(storage);
  });

  it("returns hit: false, spec: null on cache miss", async () => {
    const result = await checkCache(cache, USER_ID_1, 1);

    expect(result.hit).toBe(false);
    expect(result.spec).toBeNull();
    expect(result.key).toBe(SearchSpecCache.getCacheKey(USER_ID_1, 1));
  });

  it("returns hit: true, spec on cache hit", async () => {
    const spec = createTestSearchSpec(USER_ID_1, 1);
    await cache.set(spec);

    const result = await checkCache(cache, USER_ID_1, 1);

    expect(result.hit).toBe(true);
    expect(result.spec).toEqual(spec);
    expect(result.key).toBe(SearchSpecCache.getCacheKey(USER_ID_1, 1));
  });
});

// ============================================================================
// IDEMPOTENCE TESTS
// ============================================================================

describe("idempotence per profile_version", () => {
  let storage: InMemorySearchSpecCache;
  let cache: SearchSpecCache;

  beforeEach(() => {
    storage = new InMemorySearchSpecCache();
    cache = new SearchSpecCache(storage);
  });

  it("returns same spec for same user and version", async () => {
    const spec = createTestSearchSpec(USER_ID_1, 5);
    await cache.set(spec);

    // Multiple gets should return the same spec
    const result1 = await cache.get(USER_ID_1, 5);
    const result2 = await cache.get(USER_ID_1, 5);
    const result3 = await cache.get(USER_ID_1, 5);

    expect(result1).toEqual(spec);
    expect(result2).toEqual(spec);
    expect(result3).toEqual(spec);

    // Deep equality check
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it("setting same spec multiple times is idempotent", async () => {
    const spec = createTestSearchSpec(USER_ID_1, 5);

    // Set multiple times
    await cache.set(spec);
    await cache.set(spec);
    await cache.set(spec);

    // Should still return the spec
    const result = await cache.get(USER_ID_1, 5);
    expect(result).toEqual(spec);

    // Storage should have exactly one entry
    expect(storage.size()).toBe(1);
  });

  it("different profile_version produces different cache entries", async () => {
    const specV1 = createTestSearchSpec(USER_ID_1, 1);
    const specV2 = createTestSearchSpec(USER_ID_1, 2);

    // Modify V2 to be different
    specV2.title_keywords = [{ keyword: "Senior Developer", weight: 8 }];

    await cache.set(specV1);
    await cache.set(specV2);

    const resultV1 = await cache.get(USER_ID_1, 1);
    const resultV2 = await cache.get(USER_ID_1, 2);

    expect(resultV1).toEqual(specV1);
    expect(resultV2).toEqual(specV2);
    expect(resultV1).not.toEqual(resultV2);
  });
});
