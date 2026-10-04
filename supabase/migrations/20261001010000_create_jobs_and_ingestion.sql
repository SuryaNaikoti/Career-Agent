-- ==============================================================================
-- CAREER AGENT — JOBS & INGESTION MIGRATION (MODULE 05)
-- Schema: jobs, job_sources, job_ingestion_runs, job_source_records
-- 
-- Principles:
-- 1. UUID primary keys
-- 2. Platform-wide shared job inventory (SELECT allowed for all authenticated users)
-- 3. Mutation restricted to privileged service-role / ingestion engine
-- 4. Composite deduplication on (source_id, external_job_id) and content_hash
-- 5. Ingestion tracking with idempotency and audit logs
-- ==============================================================================

-- Workplace type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workplace_type_enum') THEN
    CREATE TYPE workplace_type_enum AS ENUM (
      'REMOTE',
      'HYBRID',
      'ONSITE',
      'UNKNOWN'
    );
  END IF;
END$$;

-- Employment type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type_enum') THEN
    CREATE TYPE employment_type_enum AS ENUM (
      'FULL_TIME',
      'PART_TIME',
      'CONTRACT',
      'TEMPORARY',
      'INTERNSHIP',
      'OTHER',
      'UNKNOWN'
    );
  END IF;
END$$;

-- Job status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canonical_job_status') THEN
    CREATE TYPE canonical_job_status AS ENUM (
      'ACTIVE',
      'STALE_CANDIDATE',
      'CLOSED',
      'REMOVED',
      'UNKNOWN'
    );
  END IF;
END$$;

-- Ingestion run status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_run_status') THEN
    CREATE TYPE ingestion_run_status AS ENUM (
      'RUNNING',
      'COMPLETED',
      'PARTIAL',
      'FAILED'
    );
  END IF;
END$$;

-- Source policy status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_policy_status') THEN
    CREATE TYPE source_policy_status AS ENUM (
      'ALLOWED',
      'REQUIRES_AUTHORIZATION',
      'RESTRICTED',
      'DISABLED',
      'UNKNOWN'
    );
  END IF;
END$$;

-- ==============================================================================
-- 1. job_sources Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_sources (
  id VARCHAR(64) PRIMARY KEY, -- e.g. 'lever', 'greenhouse', 'ashby'
  name TEXT NOT NULL,
  source_type VARCHAR(32) NOT NULL, -- 'ATS', 'PUBLIC_API', 'FEED'
  acquisition_method VARCHAR(32) NOT NULL, -- 'PUBLIC_API', 'PARTNER_API'
  policy_status source_policy_status NOT NULL DEFAULT 'ALLOWED',
  enabled BOOLEAN NOT NULL DEFAULT true,
  documentation_url TEXT,
  terms_url TEXT,
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view job sources" ON public.job_sources;
CREATE POLICY "Anyone authenticated can view job sources"
  ON public.job_sources
  FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 2. job_ingestion_runs Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(64) NOT NULL REFERENCES public.job_sources(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  status ingestion_run_status NOT NULL DEFAULT 'RUNNING',
  jobs_seen INT NOT NULL DEFAULT 0,
  jobs_created INT NOT NULL DEFAULT 0,
  jobs_updated INT NOT NULL DEFAULT 0,
  jobs_skipped INT NOT NULL DEFAULT 0,
  jobs_failed INT NOT NULL DEFAULT 0,
  error_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_job_ingestion_runs_source_id ON public.job_ingestion_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_job_ingestion_runs_status ON public.job_ingestion_runs(status);

ALTER TABLE public.job_ingestion_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ingestion runs" ON public.job_ingestion_runs;
CREATE POLICY "Authenticated users can view ingestion runs"
  ON public.job_ingestion_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 3. jobs (Canonical Jobs Inventory) Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(64) NOT NULL REFERENCES public.job_sources(id),
  external_job_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  apply_url TEXT,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  company_logo_url TEXT,
  description_raw TEXT,
  description_text TEXT NOT NULL,
  location_text TEXT NOT NULL DEFAULT 'Unspecified',
  country TEXT,
  state_region TEXT,
  city TEXT,
  workplace_type workplace_type_enum NOT NULL DEFAULT 'UNKNOWN',
  employment_type employment_type_enum NOT NULL DEFAULT 'FULL_TIME',
  experience_level TEXT,
  department TEXT,
  category TEXT,
  salary_min NUMERIC(12, 2),
  salary_max NUMERIC(12, 2),
  salary_currency VARCHAR(3),
  salary_interval VARCHAR(16), -- 'YEAR', 'MONTH', 'HOUR'
  salary_text TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  content_hash VARCHAR(64) NOT NULL,
  status canonical_job_status NOT NULL DEFAULT 'ACTIVE',
  posted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_jobs_source_external UNIQUE (source_id, external_job_id)
);

-- Performance and Query Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_content_hash ON public.jobs(content_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_company_name ON public.jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_jobs_workplace_type ON public.jobs(workplace_type);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON public.jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON public.jobs(posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_location_text ON public.jobs(location_text);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Candidates can SELECT active jobs, but cannot INSERT, UPDATE, or DELETE canonical jobs
DROP POLICY IF EXISTS "Authenticated users can search and view jobs" ON public.jobs;
CREATE POLICY "Authenticated users can search and view jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 4. Initial Seed for Permitted Job Sources
-- ==============================================================================
INSERT INTO public.job_sources (id, name, source_type, acquisition_method, policy_status, enabled, documentation_url)
VALUES 
  ('lever', 'Lever Postings API', 'ATS', 'PUBLIC_API', 'ALLOWED', true, 'https://hire.lever.co/developer/documentation'),
  ('greenhouse', 'Greenhouse Job Board API', 'ATS', 'PUBLIC_API', 'ALLOWED', true, 'https://developers.greenhouse.io/job-board.html'),
  ('linkedin', 'LinkedIn Jobs', 'JOB_BOARD', 'UNAUTHORIZED_SCRAPING', 'RESTRICTED', false, 'https://www.linkedin.com/legal/user-agreement'),
  ('indeed', 'Indeed Jobs', 'JOB_BOARD', 'UNAUTHORIZED_SCRAPING', 'RESTRICTED', false, 'https://www.indeed.com/legal')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  policy_status = EXCLUDED.policy_status,
  enabled = EXCLUDED.enabled;
