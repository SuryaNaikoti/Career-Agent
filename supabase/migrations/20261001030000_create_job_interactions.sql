-- ==============================================================================
-- CAREER AGENT — JOBS EXPERIENCE INTERACTIONS MIGRATION (MODULE 07)
-- Schema: saved_jobs, dismissed_jobs, recent_job_views
-- 
-- Principles:
-- 1. Candidate ownership strictly derived from auth.uid() = user_id
-- 2. Row Level Security: Candidates only SELECT, INSERT, DELETE their own interaction data
-- 3. Composite uniqueness on (user_id, job_id)
-- 4. Bounded recent views via upsert with viewed_at timestamp
-- 5. Canonical jobs from Module 05 remain untouched and read-only to candidates
-- ==============================================================================

-- ==============================================================================
-- TABLE: saved_jobs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_saved_jobs_user_job UNIQUE (user_id, job_id)
);

-- ==============================================================================
-- TABLE: dismissed_jobs
-- ==============================================================================
CREATE TABLE IF NOT EXISTS dismissed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_dismissed_jobs_user_job UNIQUE (user_id, job_id)
);

-- ==============================================================================
-- TABLE: recent_job_views
-- ==============================================================================
CREATE TABLE IF NOT EXISTS recent_job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recent_job_views_user_job UNIQUE (user_id, job_id)
);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON saved_jobs (job_id);

CREATE INDEX IF NOT EXISTS idx_dismissed_jobs_user_id ON dismissed_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_jobs_job_id ON dismissed_jobs (job_id);

CREATE INDEX IF NOT EXISTS idx_recent_job_views_user_id_viewed ON recent_job_views (user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_job_views_job_id ON recent_job_views (job_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Candidates may only read and mutate their own interaction records.
-- ==============================================================================
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_job_views ENABLE ROW LEVEL SECURITY;

-- saved_jobs policies
CREATE POLICY "Users can view their own saved jobs"
  ON saved_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
  ON saved_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
  ON saved_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- dismissed_jobs policies
CREATE POLICY "Users can view their own dismissed jobs"
  ON dismissed_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss jobs"
  ON dismissed_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can undismiss jobs"
  ON dismissed_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- recent_job_views policies
CREATE POLICY "Users can view their own recent job views"
  ON recent_job_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record recent job views"
  ON recent_job_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their recent job views timestamp"
  ON recent_job_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
