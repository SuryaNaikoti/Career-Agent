-- ========================================================================
-- Module 13: Autonomous Job Search Engine Migration
-- Tables:
-- 1. job_search_sessions: Tracks individual autonomous/manual search workflow runs
-- 2. job_search_session_events: Fine-grained audit trail of decisions and transitions
-- 3. agent_search_configurations: Candidate-controlled parameters & limits for the agent
--
-- Security:
-- Row-Level Security (RLS) enabled on all tables enforcing auth.uid() = user_id
-- ========================================================================

-- Session status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_search_session_status_enum') THEN
    CREATE TYPE public.job_search_session_status_enum AS ENUM (
      'CREATED',
      'RUNNING',
      'PAUSED',
      'WAITING_FOR_HUMAN',
      'COMPLETED',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END $$;

-- Session mode enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_search_session_mode_enum') THEN
    CREATE TYPE public.job_search_session_mode_enum AS ENUM (
      'MANUAL',
      'SCHEDULED',
      'AGENT'
    );
  END IF;
END $$;

-- 1. Job Search Sessions Table
CREATE TABLE IF NOT EXISTS public.job_search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.job_search_session_mode_enum NOT NULL DEFAULT 'MANUAL',
  status public.job_search_session_status_enum NOT NULL DEFAULT 'CREATED',
  
  -- Progress Metrics
  jobs_found_count INTEGER NOT NULL DEFAULT 0,
  jobs_filtered_count INTEGER NOT NULL DEFAULT 0,
  jobs_matched_count INTEGER NOT NULL DEFAULT 0,
  applications_prepared_count INTEGER NOT NULL DEFAULT 0,
  applications_submitted_count INTEGER NOT NULL DEFAULT 0,
  human_tasks_created_count INTEGER NOT NULL DEFAULT 0,
  
  -- Configuration Snapshot & Summary
  configuration_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_search_sessions_user_status 
  ON public.job_search_sessions (user_id, status, created_at DESC);

-- 2. Job Search Session Events Table (Auditing)
CREATE TABLE IF NOT EXISTS public.job_search_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.job_search_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  from_status public.job_search_session_status_enum,
  to_status public.job_search_session_status_enum,
  job_id UUID,
  application_id UUID,
  task_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_search_session_events_session 
  ON public.job_search_session_events (session_id, created_at ASC);

-- 3. Agent Search Configurations Table (Candidate limits & settings)
CREATE TABLE IF NOT EXISTS public.agent_search_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  min_match_score NUMERIC(5, 2) NOT NULL DEFAULT 65.00,
  max_applications_per_day INTEGER NOT NULL DEFAULT 5,
  max_applications_per_session INTEGER NOT NULL DEFAULT 2,
  allow_auto_submit_on_allowed_sources BOOLEAN NOT NULL DEFAULT false,
  allowed_work_modes VARCHAR(32)[] DEFAULT ARRAY['Remote', 'Hybrid']::VARCHAR(32)[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_agent_search_configurations_user 
  ON public.agent_search_configurations (user_id);

-- ========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ========================================================================

ALTER TABLE public.job_search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_search_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_search_configurations ENABLE ROW LEVEL SECURITY;

-- 1. job_search_sessions RLS
DROP POLICY IF EXISTS "Users can view own job search sessions" ON public.job_search_sessions;
CREATE POLICY "Users can view own job search sessions"
  ON public.job_search_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own job search sessions" ON public.job_search_sessions;
CREATE POLICY "Users can insert own job search sessions"
  ON public.job_search_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own job search sessions" ON public.job_search_sessions;
CREATE POLICY "Users can update own job search sessions"
  ON public.job_search_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. job_search_session_events RLS
DROP POLICY IF EXISTS "Users can view own job search session events" ON public.job_search_session_events;
CREATE POLICY "Users can view own job search session events"
  ON public.job_search_session_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own job search session events" ON public.job_search_session_events;
CREATE POLICY "Users can insert own job search session events"
  ON public.job_search_session_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. agent_search_configurations RLS
DROP POLICY IF EXISTS "Users can view own agent search configurations" ON public.agent_search_configurations;
CREATE POLICY "Users can view own agent search configurations"
  ON public.agent_search_configurations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own agent search configurations" ON public.agent_search_configurations;
CREATE POLICY "Users can insert own agent search configurations"
  ON public.agent_search_configurations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own agent search configurations" ON public.agent_search_configurations;
CREATE POLICY "Users can update own agent search configurations"
  ON public.agent_search_configurations FOR UPDATE
  USING (auth.uid() = user_id);
