-- ========================================================================
-- Module 14: Background Automation & Scheduling Migration
-- Tables:
-- 1. background_schedules: Persistent candidate automation schedules for search & reporting
-- 2. background_job_claims: Distributed atomic job claims preventing concurrency and overlaps
-- 3. background_execution_history: Complete execution history, audit logs, and retry attempts
--
-- Security:
-- Row-Level Security (RLS) enabled on all tables enforcing auth.uid() = user_id
-- ========================================================================

-- Schedule type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'background_schedule_type_enum') THEN
    CREATE TYPE public.background_schedule_type_enum AS ENUM (
      'JOB_SEARCH',
      'DAILY_REPORT'
    );
  END IF;
END $$;

-- Execution status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'background_execution_status_enum') THEN
    CREATE TYPE public.background_execution_status_enum AS ENUM (
      'PENDING',
      'CLAIMED',
      'RUNNING',
      'COMPLETED',
      'FAILED',
      'RETRYING',
      'SKIPPED'
    );
  END IF;
END $$;

-- 1. Background Schedules Table
CREATE TABLE IF NOT EXISTS public.background_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_type public.background_schedule_type_enum NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_time VARCHAR(5) NOT NULL DEFAULT '09:00', -- 'HH:MM' 24-hour format
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  
  -- Scheduling state
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_status public.background_execution_status_enum,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  
  -- Settings snapshot / overrides
  configuration_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_user_schedule_type UNIQUE (user_id, schedule_type)
);

CREATE INDEX IF NOT EXISTS idx_background_schedules_due 
  ON public.background_schedules (is_enabled, next_run_at ASC);

CREATE INDEX IF NOT EXISTS idx_background_schedules_user 
  ON public.background_schedules (user_id, schedule_type);

-- 2. Background Job Claims Table (Atomic Claiming & Distributed Mutex)
CREATE TABLE IF NOT EXISTS public.background_job_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.background_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_type public.background_schedule_type_enum NOT NULL,
  claimed_by VARCHAR(128) NOT NULL, -- Worker instance identifier
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  lease_expires_at TIMESTAMPTZ NOT NULL, -- Heartbeat lease cutoff
  is_released BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_background_job_claims_active 
  ON public.background_job_claims (schedule_id, is_released, lease_expires_at);

-- 3. Background Execution History Table
CREATE TABLE IF NOT EXISTS public.background_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.background_schedules(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_type public.background_schedule_type_enum NOT NULL,
  worker_id VARCHAR(128) NOT NULL,
  
  status public.background_execution_status_enum NOT NULL DEFAULT 'PENDING',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  
  session_id UUID, -- References job_search_sessions(id) if applicable
  report_id UUID,  -- References daily_career_reports(id) if applicable
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_details JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_background_execution_history_user 
  ON public.background_execution_history (user_id, schedule_type, created_at DESC);

-- ========================================================================
-- Row Level Security (RLS)
-- ========================================================================

ALTER TABLE public.background_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_job_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_execution_history ENABLE ROW LEVEL SECURITY;

-- background_schedules policies
CREATE POLICY "Users can read their own background schedules"
  ON public.background_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own background schedules"
  ON public.background_schedules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own background schedules"
  ON public.background_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- background_job_claims policies
CREATE POLICY "Users can read their own job claims"
  ON public.background_job_claims FOR SELECT
  USING (auth.uid() = user_id);

-- background_execution_history policies
CREATE POLICY "Users can read their own execution history"
  ON public.background_execution_history FOR SELECT
  USING (auth.uid() = user_id);
