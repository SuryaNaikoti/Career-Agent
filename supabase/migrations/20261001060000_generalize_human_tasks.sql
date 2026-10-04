-- ==============================================================================
-- CAREER AGENT — GENERAL HUMAN TASK ENGINE (MODULE 10)
-- Migration: 20261001060000_generalize_human_tasks.sql
-- 
-- Generalizes public.application_human_tasks into the unified public.human_tasks
-- engine while preserving 100% backward compatibility with Module 09.
--
-- Principles:
-- 1. UUID primary keys.
-- 2. Direct user ownership via auth.users.id.
-- 3. Strict Row Level Security (RLS) enforcing auth.uid() = user_id.
-- 4. Extensible Task Types:
--    MISSING_INFORMATION, CONFIRM_INFORMATION, CORRECT_INFORMATION,
--    REVIEW_RESUME, REVIEW_APPLICATION, ANSWER_APPLICATION_QUESTION,
--    MANUAL_APPLICATION, CONFIRM_SUBMISSION, RESOLVE_MATCH_QUESTION,
--    SENSITIVE_CONFIRMATION
-- 5. Explicit Priorities: LOW, NORMAL, HIGH, URGENT
-- 6. Explicit Status Lifecycle: OPEN, IN_PROGRESS, WAITING_FOR_USER, COMPLETED, CANCELLED, EXPIRED
-- 7. Structured Response Schemas & Input Types:
--    TEXT, LONG_TEXT, YES_NO, SINGLE_SELECT, MULTI_SELECT, NUMBER, DATE, CONFIRMATION
-- 8. Deterministic deduplication key per user + task_type + context + reason_code.
-- 9. Complete backward compatibility view/trigger or non-destructive column additions.
-- ==============================================================================

-- 1. Create Enums if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'human_task_type_enum') THEN
    CREATE TYPE human_task_type_enum AS ENUM (
      'MISSING_INFORMATION',
      'CONFIRM_INFORMATION',
      'CORRECT_INFORMATION',
      'REVIEW_RESUME',
      'REVIEW_APPLICATION',
      'ANSWER_APPLICATION_QUESTION',
      'MANUAL_APPLICATION',
      'CONFIRM_SUBMISSION',
      'RESOLVE_MATCH_QUESTION',
      'SENSITIVE_CONFIRMATION'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'human_task_priority_enum') THEN
    CREATE TYPE human_task_priority_enum AS ENUM (
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'human_task_lifecycle_status_enum') THEN
    CREATE TYPE human_task_lifecycle_status_enum AS ENUM (
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_USER',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'human_task_input_type_enum') THEN
    CREATE TYPE human_task_input_type_enum AS ENUM (
      'TEXT',
      'LONG_TEXT',
      'YES_NO',
      'SINGLE_SELECT',
      'MULTI_SELECT',
      'NUMBER',
      'DATE',
      'CONFIRMATION'
    );
  END IF;
END$$;

-- 2. General Human Tasks Table
CREATE TABLE IF NOT EXISTS public.human_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task Classification & Priority
  task_type human_task_type_enum NOT NULL,
  priority human_task_priority_enum NOT NULL DEFAULT 'NORMAL',
  status human_task_lifecycle_status_enum NOT NULL DEFAULT 'OPEN',
  reason_code VARCHAR(128) NOT NULL,
  
  -- Text & Instructions
  title VARCHAR(256) NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  
  -- Context References (Nullable for flexibility across domains)
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  preparation_id UUID REFERENCES public.application_preparations(id) ON DELETE CASCADE,
  preparation_version_id UUID REFERENCES public.application_preparation_versions(id) ON DELETE CASCADE,
  resume_id UUID,
  candidate_fact_id UUID,
  target_url TEXT,

  -- Input & Validation Schema
  input_type human_task_input_type_enum NOT NULL DEFAULT 'CONFIRMATION',
  input_options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings for SINGLE_SELECT / MULTI_SELECT
  input_placeholder VARCHAR(256),
  is_sensitive BOOLEAN NOT NULL DEFAULT false,

  -- Candidate Response & Truth Integration
  response_value JSONB,
  candidate_notes TEXT,
  candidate_confirmed BOOLEAN NOT NULL DEFAULT false,
  external_reference_id VARCHAR(256),
  external_reference_provenance VARCHAR(64), -- 'CANDIDATE_PROVIDED' or 'SYSTEM_VERIFIED'

  -- Deduplication Key: (user_id, deduplication_key)
  deduplication_key VARCHAR(256) NOT NULL,

  -- Audit & Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_human_tasks_dedup UNIQUE (user_id, deduplication_key)
);

-- Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_human_tasks_user_id ON public.human_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_human_tasks_status ON public.human_tasks(status);
CREATE INDEX IF NOT EXISTS idx_human_tasks_priority ON public.human_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_human_tasks_type ON public.human_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_human_tasks_app_id ON public.human_tasks(application_id);
CREATE INDEX IF NOT EXISTS idx_human_tasks_job_id ON public.human_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_human_tasks_created_at ON public.human_tasks(created_at);

-- Row Level Security
ALTER TABLE public.human_tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'human_tasks' AND policyname = 'Users can manage their own human tasks'
  ) THEN
    CREATE POLICY "Users can manage their own human tasks"
      ON public.human_tasks
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 3. Human Task Audit History Table
CREATE TABLE IF NOT EXISTS public.human_task_audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.human_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL, -- 'TASK_CREATED', 'TASK_STARTED', 'TASK_COMPLETED', 'TASK_CANCELLED', 'TASK_EXPIRED', 'TASK_RESPONSE_REJECTED'
  previous_status human_task_lifecycle_status_enum,
  new_status human_task_lifecycle_status_enum,
  actor_id VARCHAR(128) NOT NULL,
  actor_type VARCHAR(32) NOT NULL, -- 'CANDIDATE', 'SYSTEM', 'AI'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_audit_task_id ON public.human_task_audit_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_user_id ON public.human_task_audit_history(user_id);

ALTER TABLE public.human_task_audit_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'human_task_audit_history' AND policyname = 'Users can view their own human task audit history'
  ) THEN
    CREATE POLICY "Users can view their own human task audit history"
      ON public.human_task_audit_history
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;
