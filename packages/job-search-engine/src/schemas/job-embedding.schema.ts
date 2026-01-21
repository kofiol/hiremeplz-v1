import { z } from "zod";
import { PlatformSchema, UuidSchema } from "./user-profile.schema.js";

// ============================================================================
// JOB EMBEDDING SCHEMA
// ============================================================================
// JobEmbedding represents the vector embedding of a normalized job.
// Used for semantic retrieval (candidate retrieval stage).
//
// INVARIANTS:
// - Derived from NormalizedJob text (NO LLM reasoning, just embedding model)
// - Vector dimension depends on embedding model (e.g., 1536 for text-embedding-3-small)
// - One embedding per job (job_id is unique)
// - Embedding is recomputed ONLY if job content changes (rare)
// - Stored in embeddings table with pgvector type
// ============================================================================

/**
 * Common embedding model identifiers
 */
export const EmbeddingModelSchema = z.enum([
  "text-embedding-3-small",  // 1536 dimensions
  "text-embedding-3-large",  // 3072 dimensions
  "text-embedding-ada-002",  // 1536 dimensions (legacy)
]);

export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>;

/**
 * Embedding dimension by model
 */
export const EMBEDDING_DIMENSIONS: Record<EmbeddingModel, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
} as const;

/**
 * Vector embedding array
 * Dimension must match the embedding model used.
 *
 * INVARIANTS:
 * - All values are finite numbers
 * - Typically normalized to unit length (L2 norm = 1)
 * - Array length MUST match model dimension
 */
export const EmbeddingVectorSchema = z.array(z.number().finite());

export type EmbeddingVector = z.infer<typeof EmbeddingVectorSchema>;

/**
 * JobEmbedding for vector similarity search
 *
 * INVARIANTS:
 * - job_id references jobs.id
 * - embedding_model specifies which model generated the vector
 * - dimension MUST match EMBEDDING_DIMENSIONS[embedding_model]
 * - source_text_hash is SHA-256 of input text (for change detection)
 */
export const JobEmbeddingSchema = z.object({
  // ---- Identity ----
  /** Embedding record ID */
  id: UuidSchema.optional(),

  /** Team ID for multi-tenancy */
  team_id: UuidSchema,

  /** Reference to jobs.id */
  job_id: UuidSchema,

  // ---- Embedding Data ----
  /**
   * Vector embedding
   * Stored as pgvector type in database
   */
  embedding: EmbeddingVectorSchema,

  /**
   * Embedding model used
   */
  embedding_model: EmbeddingModelSchema,

  /**
   * Embedding dimension (for validation)
   * MUST match embedding array length
   */
  dimension: z.number().int().positive(),

  // ---- Source Tracking ----
  /**
   * SHA-256 hash of source text used to generate embedding.
   * Used to detect when job content changes and embedding needs refresh.
   */
  source_text_hash: z.string().length(64),

  /**
   * Preview of source text (first 200 chars, for debugging)
   */
  source_text_preview: z.string().max(200).optional(),

  // ---- Timestamps ----
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type JobEmbedding = z.infer<typeof JobEmbeddingSchema>;

// ============================================================================
// EMBEDDING CREATION SCHEMA
// ============================================================================

/**
 * Schema for creating a JobEmbedding (before DB insertion)
 */
export const JobEmbeddingCreateSchema = JobEmbeddingSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type JobEmbeddingCreate = z.infer<typeof JobEmbeddingCreateSchema>;

// ============================================================================
// PROFILE EMBEDDING SCHEMA
// ============================================================================

/**
 * ProfileEmbedding represents the vector embedding of a user's normalized profile.
 * Used for profile-to-job similarity matching during candidate retrieval.
 *
 * INVARIANTS:
 * - profile_version tracks which profile version this embedding represents
 * - Embedding is invalidated when profile_version changes
 * - Same embedding model must be used for job and profile embeddings
 */
export const ProfileEmbeddingSchema = z.object({
  // ---- Identity ----
  id: UuidSchema.optional(),
  team_id: UuidSchema,
  user_id: UuidSchema,

  // ---- Versioning (CRITICAL) ----
  /**
   * Profile version this embedding was generated from.
   * Embedding is STALE if this doesn't match current profile_version.
   */
  profile_version: z.number().int().positive(),

  // ---- Embedding Data ----
  embedding: EmbeddingVectorSchema,
  embedding_model: EmbeddingModelSchema,
  dimension: z.number().int().positive(),

  // ---- Source Tracking ----
  source_text_hash: z.string().length(64),
  source_text_preview: z.string().max(200).optional(),

  // ---- Timestamps ----
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ProfileEmbedding = z.infer<typeof ProfileEmbeddingSchema>;

// ============================================================================
// SIMILARITY SEARCH RESULT
// ============================================================================

/**
 * Result from vector similarity search
 */
export const SimilaritySearchResultSchema = z.object({
  /** Job ID */
  job_id: UuidSchema,

  /**
   * Similarity score (0-1 for cosine similarity)
   * Higher = more similar
   */
  similarity: z.number().min(0).max(1),

  /**
   * Distance (for other distance metrics)
   * Lower = more similar
   */
  distance: z.number().nonnegative().optional(),
});

export type SimilaritySearchResult = z.infer<typeof SimilaritySearchResultSchema>;

/**
 * Candidate retrieval result (top K jobs from vector search)
 */
export const CandidateRetrievalResultSchema = z.object({
  /** User/profile this search was for */
  user_id: UuidSchema,
  team_id: UuidSchema,

  /** Profile version used for the search */
  profile_version: z.number().int().positive(),

  /** Top K job candidates with similarity scores */
  candidates: z.array(SimilaritySearchResultSchema),

  /** Number of jobs searched */
  total_jobs_searched: z.number().int().nonnegative(),

  /** Search timestamp */
  searched_at: z.string().datetime(),
});

export type CandidateRetrievalResult = z.infer<typeof CandidateRetrievalResultSchema>;

// ============================================================================
// VALIDATION REFINEMENTS
// ============================================================================

/**
 * Validates embedding dimension matches model
 */
export const JobEmbeddingSchemaRefined = JobEmbeddingSchema.refine(
  (data) => {
    const expectedDimension = EMBEDDING_DIMENSIONS[data.embedding_model];
    return data.dimension === expectedDimension && data.embedding.length === expectedDimension;
  },
  {
    message: "Embedding dimension must match the embedding model's expected dimension",
    path: ["dimension"],
  },
);

/**
 * Validates ProfileEmbedding dimension matches model
 */
export const ProfileEmbeddingSchemaRefined = ProfileEmbeddingSchema.refine(
  (data) => {
    const expectedDimension = EMBEDDING_DIMENSIONS[data.embedding_model];
    return data.dimension === expectedDimension && data.embedding.length === expectedDimension;
  },
  {
    message: "Embedding dimension must match the embedding model's expected dimension",
    path: ["dimension"],
  },
);
