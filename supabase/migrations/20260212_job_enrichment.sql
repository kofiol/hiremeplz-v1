-- Job Enrichment Migration
-- Adds AI enrichment columns to jobs, profile embedding, vector similarity RPC

-- New columns on jobs table
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_seniority text,
  ADD COLUMN IF NOT EXISTS description_md text,
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- Profile embedding for similarity matching
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW index for fast cosine similarity
CREATE INDEX IF NOT EXISTS idx_jobs_embedding_hnsw
  ON public.jobs USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index for finding unenriched jobs quickly
CREATE INDEX IF NOT EXISTS idx_jobs_team_unenriched
  ON public.jobs(team_id) WHERE enriched_at IS NULL;

-- Add job_enrichment to agent_type enum
ALTER TYPE public.agent_type ADD VALUE IF NOT EXISTS 'job_enrichment';

-- RPC: Find top N jobs by embedding similarity to user profile
CREATE OR REPLACE FUNCTION public.match_jobs_by_embedding(
  p_team_id uuid,
  p_embedding vector(1536),
  p_match_count int DEFAULT 50,
  p_match_threshold float DEFAULT 0.2
)
RETURNS TABLE (job_id uuid, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT j.id AS job_id,
         1 - (j.embedding <=> p_embedding) AS similarity
  FROM public.jobs j
  WHERE j.team_id = p_team_id
    AND j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> p_embedding) > p_match_threshold
  ORDER BY j.embedding <=> p_embedding
  LIMIT p_match_count;
$$;
