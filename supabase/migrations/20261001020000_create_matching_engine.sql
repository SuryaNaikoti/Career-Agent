-- ==============================================================================
-- CAREER AGENT — MATCHING ENGINE MIGRATION (MODULE 06)
-- Schema: job_matches, match_components, match_requirements, match_evidence, match_skill_gaps
-- 
-- Principles:
-- 1. UUID primary keys
-- 2. User ownership model (user_id strictly checked)
-- 3. Row Level Security: Candidates can only SELECT their own match records
-- 4. Mutation restricted to privileged service role / matching engine
-- 5. Deterministic scoring versions and snapshot hashing for staleness detection
-- ==============================================================================

-- Match status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status_enum') THEN
    CREATE TYPE match_status_enum AS ENUM (
      'EXCELLENT_MATCH',
      'STRONG_MATCH',
      'MODERATE_MATCH',
      'PARTIAL_MATCH',
      'LOW_MATCH',
      'BLOCKED_BY_REQUIREMENT',
      'INSUFFICIENT_DATA'
    );
  END IF;
END$$;

-- Qualification status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qualification_status_enum') THEN
    CREATE TYPE qualification_status_enum AS ENUM (
      'MET',
      'PARTIALLY_MET',
      'MISSING',
      'UNKNOWN',
      'NOT_APPLICABLE'
    );
  END IF;
END$$;

-- Requirement importance enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requirement_importance_enum') THEN
    CREATE TYPE requirement_importance_enum AS ENUM (
      'REQUIRED',
      'PREFERRED'
    );
  END IF;
END$$;

-- ==============================================================================
-- TABLE: job_matches
-- ==============================================================================
CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  overall_score NUMERIC(5, 2) NOT NULL,
  match_status match_status_enum NOT NULL,
  critical_requirement_count INT NOT NULL DEFAULT 0,
  required_gap_count INT NOT NULL DEFAULT 0,
  preferred_gap_count INT NOT NULL DEFAULT 0,
  scoring_version VARCHAR(32) NOT NULL,
  analysis_version VARCHAR(32) NOT NULL,
  candidate_snapshot_hash VARCHAR(64) NOT NULL,
  job_snapshot_hash VARCHAR(64) NOT NULL,
  summary_explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_job_matches_user_job UNIQUE (user_id, job_id)
);

-- ==============================================================================
-- TABLE: match_components
-- ==============================================================================
CREATE TABLE IF NOT EXISTS match_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_type VARCHAR(64) NOT NULL,
  raw_score NUMERIC(5, 2) NOT NULL,
  weight NUMERIC(4, 3) NOT NULL,
  weighted_score NUMERIC(5, 2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE: match_requirements
-- ==============================================================================
CREATE TABLE IF NOT EXISTS match_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requirement_type VARCHAR(64) NOT NULL,
  requirement_name TEXT NOT NULL,
  importance requirement_importance_enum NOT NULL DEFAULT 'REQUIRED',
  qualification_status qualification_status_enum NOT NULL DEFAULT 'UNKNOWN',
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE: match_evidence
-- ==============================================================================
CREATE TABLE IF NOT EXISTS match_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES match_requirements(id) ON DELETE CASCADE,
  source_type VARCHAR(64) NOT NULL,
  source_reference TEXT,
  truth_state VARCHAR(64) NOT NULL,
  evidence_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE: match_skill_gaps
-- ==============================================================================
CREATE TABLE IF NOT EXISTS match_skill_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES job_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  gap_type VARCHAR(32) NOT NULL,
  importance requirement_importance_enum NOT NULL DEFAULT 'REQUIRED',
  transferable BOOLEAN NOT NULL DEFAULT false,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_job_matches_user_id ON job_matches (user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches (job_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_user_job ON job_matches (user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_match_components_match_id ON match_components (match_id);
CREATE INDEX IF NOT EXISTS idx_match_requirements_match_id ON match_requirements (match_id);
CREATE INDEX IF NOT EXISTS idx_match_evidence_match_id ON match_evidence (match_id);
CREATE INDEX IF NOT EXISTS idx_match_skill_gaps_match_id ON match_skill_gaps (match_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Candidates can only SELECT their own records.
-- Direct INSERT/UPDATE/DELETE from client roles is prohibited.
-- ==============================================================================
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_skill_gaps ENABLE ROW LEVEL SECURITY;

-- job_matches policies
CREATE POLICY "Users can view their own job matches"
  ON job_matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- match_components policies
CREATE POLICY "Users can view their own match components"
  ON match_components FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- match_requirements policies
CREATE POLICY "Users can view their own match requirements"
  ON match_requirements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- match_evidence policies
CREATE POLICY "Users can view their own match evidence"
  ON match_evidence FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- match_skill_gaps policies
CREATE POLICY "Users can view their own match skill gaps"
  ON match_skill_gaps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
