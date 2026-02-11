-- Job bookmarks table for user-saved jobs
CREATE TABLE job_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id, job_id)
);

CREATE INDEX idx_job_bookmarks_team_user ON job_bookmarks(team_id, user_id);

-- Performance indexes on jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_team_posted ON jobs(team_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_hash ON jobs(canonical_hash);
