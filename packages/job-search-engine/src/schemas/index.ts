// ============================================================================
// JOB SEARCH ENGINE - SCHEMAS INDEX
// ============================================================================
// Central export for all type definitions and Zod schemas.
// This package contains ONLY types and validators - no business logic.
// ============================================================================

// ----------------------------------------------------------------------------
// User Profile
// ----------------------------------------------------------------------------
export {
  // Core schemas
  UuidSchema,
  SkillLevelSchema,
  UserSkillSchema,
  UserExperienceSchema,
  UserEducationSchema,
  PlatformSchema,
  ProjectTypeSchema,
  UserPreferencesSchema,
  UserProfileSchema,
  UserProfileUpdateSchema,
  // Types
  type UserSkill,
  type UserExperience,
  type UserEducation,
  type Platform,
  type ProjectType,
  type UserPreferences,
  type UserProfile,
  type UserProfileUpdate,
} from "./user-profile.schema.js";

// ----------------------------------------------------------------------------
// Normalized Profile
// ----------------------------------------------------------------------------
export {
  // Core schemas
  NormalizedSkillSchema,
  NormalizedExperienceSchema,
  NormalizedEducationSchema,
  SeniorityLevelSchema,
  RemotePreferenceSchema,
  ContractTypeSchema,
  NormalizedPreferencesSchema,
  NormalizedProfileSchema,
  // Helpers
  validateProfileVersionMatch,
  // Types
  type NormalizedSkill,
  type NormalizedExperience,
  type NormalizedEducation,
  type SeniorityLevel,
  type RemotePreference,
  type ContractType,
  type NormalizedPreferences,
  type NormalizedProfile,
} from "./normalized-profile.schema.js";

// ----------------------------------------------------------------------------
// Search Spec
// ----------------------------------------------------------------------------
export {
  // Core schemas
  WeightedKeywordSchema,
  LocationPreferenceSchema,
  SearchSpecSchema,
  SearchSpecSchemaRefined,
  // Helpers
  getSearchSpecCacheKey,
  // Types
  type WeightedKeyword,
  type LocationPreference,
  type SearchSpec,
} from "./search-spec.schema.js";

// ----------------------------------------------------------------------------
// Raw Job
// ----------------------------------------------------------------------------
export {
  // Core schemas
  RawJobBaseSchema,
  LinkedInRawJobSchema,
  UpworkRawJobSchema,
  RawJobSchema,
  JobSourceRecordSchema,
  // Types
  type LinkedInRawJob,
  type UpworkRawJob,
  type RawJob,
  type JobSourceRecord,
} from "./raw-job.schema.js";

// ----------------------------------------------------------------------------
// Normalized Job
// ----------------------------------------------------------------------------
export {
  // Core schemas
  BudgetTypeSchema,
  JobSenioritySchema,
  NormalizedJobSchema,
  NormalizedJobCreateSchema,
  NormalizedJobDisplaySchema,
  NormalizedJobSchemaRefined,
  // Types
  type BudgetType,
  type JobSeniority,
  type NormalizedJob,
  type NormalizedJobCreate,
  type NormalizedJobDisplay,
  type ComputeCanonicalHash,
} from "./normalized-job.schema.js";

// ----------------------------------------------------------------------------
// Job Embedding
// ----------------------------------------------------------------------------
export {
  // Core schemas
  EmbeddingModelSchema,
  EmbeddingVectorSchema,
  JobEmbeddingSchema,
  JobEmbeddingCreateSchema,
  ProfileEmbeddingSchema,
  SimilaritySearchResultSchema,
  CandidateRetrievalResultSchema,
  JobEmbeddingSchemaRefined,
  ProfileEmbeddingSchemaRefined,
  // Constants
  EMBEDDING_DIMENSIONS,
  // Types
  type EmbeddingModel,
  type EmbeddingVector,
  type JobEmbedding,
  type JobEmbeddingCreate,
  type ProfileEmbedding,
  type SimilaritySearchResult,
  type CandidateRetrievalResult,
} from "./job-embedding.schema.js";

// ----------------------------------------------------------------------------
// Job Score
// ----------------------------------------------------------------------------
export {
  // Core schemas
  MatchScoreSchema,
  ScoreFactorSchema,
  ScoreBreakdownSchema,
  ReasoningPointSchema,
  JobScoreSchema,
  JobScoreLLMOutputSchema,
  JobScoreCreateSchema,
  ScoredJobDisplaySchema,
  JobRankingLatestSchema,
  JobScoreSchemaRefined,
  // Types
  type MatchScore,
  type ScoreFactor,
  type ScoreBreakdown,
  type ReasoningPoint,
  type JobScore,
  type JobScoreLLMOutput,
  type JobScoreCreate,
  type ScoredJobDisplay,
  type JobRankingLatest,
} from "./job-score.schema.js";

// ----------------------------------------------------------------------------
// Versioning
// ----------------------------------------------------------------------------
export {
  // Core schemas
  ProfileVersionSchema,
  StalenessCheckResultSchema,
  VersionedDataSchema,
  StaleDataQuerySchema,
  StaleItemSchema,
  RecomputeQueueItemSchema,
  ProfileVersionHistorySchema,
  // Constants
  MIN_PROFILE_VERSION,
  MAX_PROFILE_VERSION,
  // Helpers
  checkStaleness,
  isStale,
  isFresh,
  validateVersionUpdate,
  getNextVersion,
  // Types
  type ProfileVersion,
  type StalenessCheckResult,
  type VersionedData,
  type StaleDataQuery,
  type StaleItem,
  type RecomputeQueueItem,
  type ProfileVersionHistory,
} from "./versioning.schema.js";
