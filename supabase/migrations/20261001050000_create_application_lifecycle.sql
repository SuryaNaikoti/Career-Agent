-- ==============================================================================
-- CAREER AGENT — APPLICATION LIFECYCLE & SUBMISSION MIGRATION (MODULE 09)
-- Schema: applications, application_submission_attempts, application_status_history,
--         application_human_tasks
-- 
-- Principles:
-- 1. UUID primary keys.
-- 2. Direct user ownership via auth.users.id.
-- 3. Strict Row Level Security (RLS) enforcing auth.uid() = user_id.
-- 4. Application lifecycle state machine:
--    READY_FOR_SUBMISSION, SUBMISSION_PENDING, HUMAN_ACTION_REQUIRED,
--    SUBMITTING, SUBMITTED, SUBMISSION_FAILED, WITHDRAWN, CANCELLED
-- 5. Submission strategy:
--    AUTHORIZED_AUTOMATIC, ASSISTED_APPLICATION, HUMAN_REQUIRED, RESTRICTED, DISABLED
-- 6. References immutable preparation versions from Module 08 (preparation_id, preparation_version_id).
-- 7. Persists every submission attempt and status transition with audit trails.
-- 8. Idempotency enforced via unique constraints and server-side checking.
-- ==============================================================================

-- Lifecycle Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_lifecycle_status_enum') THEN
    CREATE TYPE application_lifecycle_status_enum AS ENUM (
      'READY_FOR_SUBMISSION',
      'SUBMISSION_PENDING',
      'HUMAN_ACTION_REQUIRED',
      'SUBMITTING',
      'SUBMITTED',
      'SUBMISSION_FAILED',
      'WITHDRAWN',
      'CANCELLED'
    );
  END IF;
END$$;

-- Submission Strategy Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_strategy_enum') THEN
    CREATE TYPE submission_strategy_enum AS ENUM (
      'AUTHORIZED_AUTOMATIC',
      'ASSISTED_APPLICATION',
      'HUMAN_REQUIRED',
      'RESTRICTED',
      'DISABLED'
    );
  END IF;
END$$;

-- Submission Mode / Method Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_method_enum') THEN
    CREATE TYPE submission_method_enum AS ENUM (
      'AUTHORIZED_ATS_API',
      'CANDIDATE_CONFIRMED_EXTERNAL',
      'MANUAL_HUMAN'
    );
  END IF;
END$$;

-- Attempt Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_attempt_status_enum') THEN
    CREATE TYPE submission_attempt_status_enum AS ENUM (
      'INITIATED',
      'SUCCEEDED',
      'FAILED',
      'TIMED_OUT',
      'CHALLENGE_REQUIRED',
      'UNKNOWN_RESULT'
    );
  END IF;
END$$;

-- Human Task Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'human_task_status_enum') THEN
    CREATE TYPE human_task_status_enum AS ENUM (
      'PENDING',
      'STARTED',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END$$;

-- ==============================================================================
-- 1. applications (Core lifecycle record per candidate application workflow)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  preparation_id UUID NOT NULL REFERENCES public.application_preparations(id) ON DELETE CASCADE,
  preparation_version_id UUID NOT NULL REFERENCES public.application_preparation_versions(id) ON DELETE CASCADE,
  
  -- Lifecycle State & Strategy
  status application_lifecycle_status_enum NOT NULL DEFAULT 'READY_FOR_SUBMISSION',
  submission_strategy submission_strategy_enum NOT NULL,
  submission_method submission_method_enum,
  
  -- Idempotency key for preventing duplicate submission requests
  idempotency_key VARCHAR(128) NOT NULL,

  -- Verified or Confirmed submission details
  external_application_id VARCHAR(256),
  external_application_id_provenance VARCHAR(64), -- 'SYSTEM_VERIFIED', 'CANDIDATE_PROVIDED', 'UNKNOWN'
  confirmation_url TEXT,
  submitted_at TIMESTAMPTZ,
  is_verified_submission BOOLEAN NOT NULL DEFAULT false,
  submission_verification_source VARCHAR(64), -- 'AUTHORIZED_ADAPTER' or 'CANDIDATE_CONFIRMATION'

  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_applications_user_prep_version UNIQUE (user_id, preparation_version_id),
  CONSTRAINT uq_applications_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_prep_id ON public.applications(preparation_id);

-- ==============================================================================
-- 2. application_submission_attempts (Persistent auditable log of submission tries)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_submission_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preparation_version_id UUID NOT NULL REFERENCES public.application_preparation_versions(id) ON DELETE CASCADE,
  
  source_id VARCHAR(64) NOT NULL,
  adapter_id VARCHAR(64) NOT NULL,
  attempt_status submission_attempt_status_enum NOT NULL DEFAULT 'INITIATED',
  
  -- External responses
  http_status INT,
  external_application_id VARCHAR(256),
  confirmation_url TEXT,
  
  -- Failure tracking
  failure_code VARCHAR(64),
  failure_category VARCHAR(64),
  sanitized_error_message TEXT,
  correlation_id VARCHAR(128) NOT NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sub_attempts_app_id ON public.application_submission_attempts(application_id);
CREATE INDEX IF NOT EXISTS idx_sub_attempts_user_id ON public.application_submission_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_attempts_status ON public.application_submission_attempts(attempt_status);

-- ==============================================================================
-- 3. application_human_tasks (Human submission tasks for restricted/external flows)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_human_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  preparation_version_id UUID NOT NULL REFERENCES public.application_preparation_versions(id) ON DELETE CASCADE,

  title VARCHAR(256) NOT NULL,
  reason TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status human_task_status_enum NOT NULL DEFAULT 'PENDING',
  
  instructions TEXT,
  candidate_notes TEXT,
  candidate_confirmed_submission BOOLEAN NOT NULL DEFAULT false,
  candidate_external_application_id VARCHAR(256),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_human_tasks_app_id ON public.application_human_tasks(application_id);
CREATE INDEX IF NOT EXISTS idx_human_tasks_user_id ON public.application_human_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_human_tasks_status ON public.application_human_tasks(status);

-- ==============================================================================
-- 4. application_status_history (Immutable audit timeline of lifecycle transitions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  previous_status application_lifecycle_status_enum,
  new_status application_lifecycle_status_enum NOT NULL,
  
  actor_type VARCHAR(32) NOT NULL, -- 'CANDIDATE', 'SYSTEM', 'AUTHORIZED_ADAPTER', 'ADMIN'
  actor_id VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id VARCHAR(128) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_status_hist_app_id ON public.application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_status_hist_user_id ON public.application_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_status_hist_created ON public.application_status_history(created_at);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- Candidates strictly manage and view their own application lifecycle records.
-- ==============================================================================
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_submission_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_human_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- applications policies
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
CREATE POLICY "Users can update own applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- application_submission_attempts policies
DROP POLICY IF EXISTS "Users can view own submission attempts" ON public.application_submission_attempts;
CREATE POLICY "Users can view own submission attempts"
  ON public.application_submission_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own submission attempts" ON public.application_submission_attempts;
CREATE POLICY "Users can insert own submission attempts"
  ON public.application_submission_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- application_human_tasks policies
DROP POLICY IF EXISTS "Users can view own human tasks" ON public.application_human_tasks;
CREATE POLICY "Users can view own human tasks"
  ON public.application_human_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own human tasks" ON public.application_human_tasks;
CREATE POLICY "Users can insert own human tasks"
  ON public.application_human_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own human tasks" ON public.application_human_tasks;
CREATE POLICY "Users can update own human tasks"
  ON public.application_human_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- application_status_history policies
DROP POLICY IF EXISTS "Users can view own status history" ON public.application_status_history;
CREATE POLICY "Users can view own status history"
  ON public.application_status_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own status history" ON public.application_status_history;
CREATE POLICY "Users can insert own status history"
  ON public.application_status_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
