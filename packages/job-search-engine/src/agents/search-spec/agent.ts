// ============================================================================
// SEARCH SPEC GENERATION AGENT
// ============================================================================
// OpenAI Agent that generates SearchSpec from NormalizedProfile.
//
// CONSTRAINTS:
// - ONE prompt (static, no dynamic generation)
// - ONE schema (SearchSpecLLMOutputSchema)
// - Cached by profile_version
// - Retry-safe (idempotent per profile_version)
// - Strict JSON output enforced by Zod
//
// FLOW:
// 1. Check cache for existing SearchSpec
// 2. If hit, return cached spec
// 3. If miss, invoke LLM agent
// 4. Validate LLM output against schema
// 5. Merge with identity fields from profile
// 6. Cache result
// 7. Return SearchSpec
// ============================================================================

import { Agent, run } from "@openai/agents";
import type { NormalizedProfile, SearchSpec, Platform } from "../../schemas/index.js";
import { SearchSpecSchema } from "../../schemas/index.js";
import { SearchSpecLLMOutputSchema, type SearchSpecLLMOutput } from "./schema.js";
import { SEARCH_SPEC_SYSTEM_PROMPT, formatUserMessage } from "./prompt.js";
import {
  SearchSpecCache,
  InMemorySearchSpecCache,
  type SearchSpecCacheStorage,
} from "./cache.js";

// #region agent log
fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent.ts:INIT',message:'Agent module loaded',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-module-load'})}).catch(()=>{});
// #endregion

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

/**
 * OpenAI model to use for search spec generation.
 * Using gpt-4o-mini for cost efficiency (small, cached task).
 */
const DEFAULT_MODEL = "gpt-4o-mini" as const;

/**
 * Agent configuration options.
 */
export interface SearchSpecAgentOptions {
  /** OpenAI model to use (default: gpt-4o-mini) */
  model?: string;
  /** Cache storage backend (default: in-memory) */
  cacheStorage?: SearchSpecCacheStorage;
  /** Cache TTL in seconds (default: no expiration, relies on version) */
  cacheTtlSeconds?: number;
  /** Maximum retries on failure (default: 2) */
  maxRetries?: number;
}

/**
 * Result of search spec generation.
 */
export interface GenerateSearchSpecResult {
  /** Generated or cached SearchSpec */
  spec: SearchSpec;
  /** Whether result was from cache */
  fromCache: boolean;
  /** Cache key used */
  cacheKey: string;
}

// ============================================================================
// AGENT FACTORY
// ============================================================================

/**
 * Creates the OpenAI Agent for search spec generation.
 * Agent uses structured output with Zod schema.
 */
function createSearchSpecAgent(model: string = DEFAULT_MODEL) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent.ts:createSearchSpecAgent',message:'Creating agent',data:{model},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-agent-create'})}).catch(()=>{});
  // #endregion
  
  return new Agent({
    name: "SearchSpecGenerator",
    instructions: SEARCH_SPEC_SYSTEM_PROMPT,
    model,
    outputType: SearchSpecLLMOutputSchema,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps contract_type from NormalizedProfile to contract_types array.
 */
function mapContractType(
  contractType: string,
): Array<"freelance" | "contract" | "full_time" | "part_time"> {
  switch (contractType) {
    case "freelance":
      return ["freelance"];
    case "contract":
      return ["contract"];
    case "full_time":
      return ["full_time"];
    case "part_time":
      return ["part_time"];
    case "any":
    default:
      return ["freelance", "contract"];
  }
}

/**
 * Merges LLM output with identity fields to create full SearchSpec.
 */
function mergeToSearchSpec(
  llmOutput: SearchSpecLLMOutput,
  profile: NormalizedProfile,
): SearchSpec {
  const now = new Date().toISOString();

  return {
    // Identity from profile
    user_id: profile.user_id,
    team_id: profile.team_id,
    profile_version: profile.profile_version,

    // LLM-generated fields
    title_keywords: llmOutput.title_keywords,
    skill_keywords: llmOutput.skill_keywords,
    negative_keywords: llmOutput.negative_keywords,
    locations: llmOutput.locations,
    seniority_levels: llmOutput.seniority_levels,
    remote_preference: llmOutput.remote_preference,
    contract_types: llmOutput.contract_types,
    hourly_min: llmOutput.hourly_min,
    hourly_max: llmOutput.hourly_max,
    fixed_budget_min: llmOutput.fixed_budget_min,

    // From profile preferences
    platforms: profile.preferences.platforms as Platform[],
    max_results_per_platform: 100,

    // Metadata
    generated_at: now,
  };
}

/**
 * Serializes profile for LLM input.
 * Only includes relevant fields to reduce token usage.
 */
function serializeProfileForLLM(profile: NormalizedProfile): string {
  const relevantData = {
    display_name: profile.display_name,
    total_experience_months: profile.total_experience_months,
    inferred_seniority: profile.inferred_seniority,
    primary_skills: profile.primary_skills.map((s) => ({
      name: s.display_name,
      level: s.level,
      years: s.years,
    })),
    secondary_skills: profile.secondary_skills.slice(0, 10).map((s) => ({
      name: s.display_name,
      level: s.level,
    })),
    experiences: profile.experiences.slice(0, 5).map((e) => ({
      title: e.title,
      company: e.company,
      duration_months: e.duration_months,
      is_current: e.is_current,
    })),
    title_keywords: profile.title_keywords,
    preferences: {
      platforms: profile.preferences.platforms,
      hourly_rate: profile.preferences.hourly_rate,
      fixed_budget: profile.preferences.fixed_budget,
      remote_preference: profile.preferences.remote_preference,
      contract_type: profile.preferences.contract_type,
      tightness: profile.preferences.tightness,
    },
  };

  return JSON.stringify(relevantData, null, 2);
}

// ============================================================================
// MAIN AGENT CLASS
// ============================================================================

/**
 * SearchSpec generation agent with caching.
 *
 * USAGE:
 * ```ts
 * const agent = new SearchSpecAgent();
 * const result = await agent.generate(normalizedProfile);
 * console.log(result.spec);
 * console.log(result.fromCache);
 * ```
 *
 * GUARANTEES:
 * - Idempotent per profile_version (cached)
 * - Output strictly conforms to SearchSpec schema
 * - Retry-safe (can be called multiple times)
 */
export class SearchSpecAgent {
  private agent: ReturnType<typeof createSearchSpecAgent>;
  private cache: SearchSpecCache;
  private cacheTtlSeconds?: number;
  private maxRetries: number;

  constructor(options: SearchSpecAgentOptions = {}) {
    this.agent = createSearchSpecAgent(options.model);
    this.cache = new SearchSpecCache(
      options.cacheStorage ?? new InMemorySearchSpecCache(),
    );
    this.cacheTtlSeconds = options.cacheTtlSeconds;
    this.maxRetries = options.maxRetries ?? 2;
  }

  /**
   * Generates SearchSpec from NormalizedProfile.
   *
   * FLOW:
   * 1. Check cache by (user_id, profile_version)
   * 2. If cached, return immediately
   * 3. Otherwise, invoke LLM agent
   * 4. Validate output, merge with identity fields
   * 5. Cache and return
   *
   * @param profile - Normalized user profile
   * @returns SearchSpec with cache metadata
   * @throws Error if LLM fails after retries or validation fails
   */
  async generate(profile: NormalizedProfile): Promise<GenerateSearchSpecResult> {
    const cacheKey = SearchSpecCache.getCacheKey(
      profile.user_id,
      profile.profile_version,
    );

    // 1. Check cache
    const cached = await this.cache.get(
      profile.user_id,
      profile.profile_version,
    );

    if (cached) {
      return {
        spec: cached,
        fromCache: true,
        cacheKey,
      };
    }

    // 2. Invoke LLM agent with retries
    let lastError: Error | null = null;
    let llmOutput: SearchSpecLLMOutput | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const profileJson = serializeProfileForLLM(profile);
        const userMessage = formatUserMessage(profileJson);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent.ts:generate:before-run',message:'About to run agent',data:{attempt,profileVersion:profile.profile_version},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-run-call'})}).catch(()=>{});
        // #endregion

        const result = await run(this.agent, userMessage);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent.ts:generate:after-run',message:'Agent run completed',data:{hasFinalOutput:!!result.finalOutput,finalOutputType:typeof result.finalOutput,finalOutputKeys:result.finalOutput && typeof result.finalOutput === 'object' ? Object.keys(result.finalOutput as object) : []},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-run-result'})}).catch(()=>{});
        // #endregion

        if (!result.finalOutput) {
          throw new Error("Agent returned no output");
        }

        // Output is already validated by the agent's outputType - cast to expected type
        llmOutput = result.finalOutput as SearchSpecLLMOutput;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25d17162-8518-4d3a-ad84-ff94ccaf2f34',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agent.ts:generate:error',message:'Agent run error',data:{attempt,error:lastError.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-run-error'})}).catch(()=>{});
        // #endregion

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          throw new Error(
            `SearchSpec generation failed after ${this.maxRetries + 1} attempts: ${lastError.message}`,
          );
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }

    if (!llmOutput) {
      throw new Error("SearchSpec generation failed: no output");
    }

    // 3. Merge with identity fields
    const spec = mergeToSearchSpec(llmOutput, profile);

    // 4. Validate final SearchSpec (sanity check)
    const validated = SearchSpecSchema.parse(spec);

    // 5. Cache result
    await this.cache.set(validated, this.cacheTtlSeconds);

    return {
      spec: validated,
      fromCache: false,
      cacheKey,
    };
  }

  /**
   * Checks if SearchSpec is cached for given profile version.
   */
  async isCached(userId: string, profileVersion: number): Promise<boolean> {
    return this.cache.has(userId, profileVersion);
  }

  /**
   * Invalidates cached SearchSpec for a profile version.
   */
  async invalidateCache(userId: string, profileVersion: number): Promise<void> {
    await this.cache.invalidate(userId, profileVersion);
  }

  /**
   * Gets the cache instance for testing/inspection.
   */
  getCache(): SearchSpecCache {
    return this.cache;
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Generates SearchSpec using default agent configuration.
 * For simple use cases without custom configuration.
 *
 * @param profile - Normalized user profile
 * @returns SearchSpec
 */
export async function generateSearchSpec(
  profile: NormalizedProfile,
): Promise<SearchSpec> {
  const agent = new SearchSpecAgent();
  const result = await agent.generate(profile);
  return result.spec;
}
