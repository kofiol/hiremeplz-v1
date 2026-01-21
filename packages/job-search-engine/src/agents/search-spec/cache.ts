// ============================================================================
// SEARCH SPEC CACHE
// ============================================================================
// In-memory cache for SearchSpec by profile_version.
// Supports pluggable storage backends for production use.
//
// CACHE KEY: `search_spec:{user_id}:v{profile_version}`
//
// BEHAVIOR:
// - Cache hit: Return cached SearchSpec immediately
// - Cache miss: Return null, caller should generate new spec
// - Automatic invalidation: profile_version change = cache miss
// ============================================================================

import type { SearchSpec } from "../../schemas/index.js";

/**
 * Cache storage interface.
 * Implement this for different backends (Redis, Supabase, etc.)
 */
export interface SearchSpecCacheStorage {
  get(key: string): Promise<SearchSpec | null>;
  set(key: string, value: SearchSpec, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory cache storage for development/testing.
 * NOT suitable for production (no persistence, no distribution).
 */
export class InMemorySearchSpecCache implements SearchSpecCacheStorage {
  private cache = new Map<
    string,
    { value: SearchSpec; expiresAt: number | null }
  >();

  async get(key: string): Promise<SearchSpec | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: SearchSpec,
    ttlSeconds?: number,
  ): Promise<void> {
    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries (for testing).
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size (for testing).
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * SearchSpec cache manager.
 * Handles cache key generation and lookup by profile_version.
 */
export class SearchSpecCache {
  constructor(private storage: SearchSpecCacheStorage) {}

  /**
   * Generates cache key for a user's search spec.
   * Key format: `search_spec:{user_id}:v{profile_version}`
   */
  static getCacheKey(userId: string, profileVersion: number): string {
    return `search_spec:${userId}:v${profileVersion}`;
  }

  /**
   * Gets cached SearchSpec for a user's profile version.
   *
   * @param userId - User ID
   * @param profileVersion - Profile version number
   * @returns Cached SearchSpec or null if not found/expired
   */
  async get(userId: string, profileVersion: number): Promise<SearchSpec | null> {
    const key = SearchSpecCache.getCacheKey(userId, profileVersion);
    return this.storage.get(key);
  }

  /**
   * Caches a SearchSpec.
   *
   * @param spec - SearchSpec to cache
   * @param ttlSeconds - Optional TTL in seconds (default: no expiration)
   */
  async set(spec: SearchSpec, ttlSeconds?: number): Promise<void> {
    const key = SearchSpecCache.getCacheKey(spec.user_id, spec.profile_version);
    await this.storage.set(key, spec, ttlSeconds);
  }

  /**
   * Invalidates cached SearchSpec for a user's profile version.
   *
   * @param userId - User ID
   * @param profileVersion - Profile version to invalidate
   */
  async invalidate(userId: string, profileVersion: number): Promise<void> {
    const key = SearchSpecCache.getCacheKey(userId, profileVersion);
    await this.storage.delete(key);
  }

  /**
   * Checks if a SearchSpec is cached.
   *
   * @param userId - User ID
   * @param profileVersion - Profile version number
   * @returns true if cached, false otherwise
   */
  async has(userId: string, profileVersion: number): Promise<boolean> {
    const spec = await this.get(userId, profileVersion);
    return spec !== null;
  }
}

/**
 * Default in-memory cache instance for development.
 * Replace with Redis/Supabase in production.
 */
export const defaultSearchSpecCache = new SearchSpecCache(
  new InMemorySearchSpecCache(),
);

/**
 * Cache result type for the agent.
 */
export interface CacheResult {
  hit: boolean;
  spec: SearchSpec | null;
  key: string;
}

/**
 * Checks cache and returns result with metadata.
 */
export async function checkCache(
  cache: SearchSpecCache,
  userId: string,
  profileVersion: number,
): Promise<CacheResult> {
  const key = SearchSpecCache.getCacheKey(userId, profileVersion);
  const spec = await cache.get(userId, profileVersion);

  return {
    hit: spec !== null,
    spec,
    key,
  };
}
