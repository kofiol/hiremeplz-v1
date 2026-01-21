// ============================================================================
// SEARCH SPEC AGENT - EXPORTS
// ============================================================================

// Main agent
export {
  SearchSpecAgent,
  generateSearchSpec,
  type SearchSpecAgentOptions,
  type GenerateSearchSpecResult,
} from "./agent.js";

// LLM output schema
export {
  SearchSpecLLMOutputSchema,
  LLMWeightedKeywordSchema,
  LLMLocationSchema,
  LLMSeniorityLevelSchema,
  LLMRemotePreferenceSchema,
  LLMContractTypeSchema,
  validateLLMOutput,
  safeValidateLLMOutput,
  type SearchSpecLLMOutput,
} from "./schema.js";

// Cache
export {
  SearchSpecCache,
  InMemorySearchSpecCache,
  defaultSearchSpecCache,
  checkCache,
  type SearchSpecCacheStorage,
  type CacheResult,
} from "./cache.js";

// Prompt (for inspection/testing)
export { SEARCH_SPEC_SYSTEM_PROMPT, formatUserMessage } from "./prompt.js";
