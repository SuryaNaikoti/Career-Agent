-- ==============================================================================
-- CAREER AGENT — GMAIL & HIRING INTELLIGENCE (MODULE 11)
-- Migration: 20261001070000_create_gmail_and_hiring_intelligence.sql
-- 
-- Principles:
-- 1. Read-only Gmail integration for candidate hiring communication.
-- 2. Scope strictly limited to: https://www.googleapis.com/auth/gmail.readonly.
-- 3. Direct user ownership via auth.users.id.
-- 4. Strict Row Level Security (RLS) enforcing auth.uid() = user_id on all tables.
-- 5. Encrypted server-side token storage (never returned to frontend).
-- 6. Structured hiring classifications:
--    RECRUITER_OUTREACH, APPLICATION_RECEIVED, APPLICATION_UPDATE,
--    INTERVIEW_INVITATION, INTERVIEW_SCHEDULE, ASSESSMENT_REQUEST,
--    ADDITIONAL_INFORMATION_REQUEST, REJECTION, OFFER, FOLLOW_UP_REQUEST,
--    WITHDRAWAL_OR_CANCELLATION, OTHER_HIRING, NOT_HIRING
-- 7. Idempotent email synchronization by external Gmail message ID.
-- 8. Auditable event history.
-- ==============================================================================

-- 1. Create Enums if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmail_connection_status_enum') THEN
    CREATE TYPE gmail_connection_status_enum AS ENUM (
      'CONNECTED',
      'EXPIRED',
      'REVOKED',
      'DISCONNECTED',
      'ERROR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hiring_email_classification_enum') THEN
    CREATE TYPE hiring_email_classification_enum AS ENUM (
      'RECRUITER_OUTREACH',
      'APPLICATION_RECEIVED',
      'APPLICATION_UPDATE',
      'INTERVIEW_INVITATION',
      'INTERVIEW_SCHEDULE',
      'ASSESSMENT_REQUEST',
      'ADDITIONAL_INFORMATION_REQUEST',
      'REJECTION',
      'OFFER',
      'FOLLOW_UP_REQUEST',
      'WITHDRAWAL_OR_CANCELLATION',
      'OTHER_HIRING',
      'NOT_HIRING'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gmail_sync_status_enum') THEN
    CREATE TYPE gmail_sync_status_enum AS ENUM (
      'RUNNING',
      'COMPLETED',
      'FAILED',
      'PARTIAL'
    );
  END IF;
END$$;

-- 2. gmail_connections Table
CREATE TABLE IF NOT EXISTS public.gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email VARCHAR(256),
  google_account_id VARCHAR(128),
  connection_status gmail_connection_status_enum NOT NULL DEFAULT 'CONNECTED',
  scopes VARCHAR(512) NOT NULL,
  encrypted_refresh_token TEXT,
  encrypted_access_token TEXT,
  token_expiry TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_history_id VARCHAR(128),
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_gmail_connections_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_connections_user_id ON public.gmail_connections(user_id);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gmail_connections' AND policyname = 'Users can manage their own gmail connection'
  ) THEN
    CREATE POLICY "Users can manage their own gmail connection"
      ON public.gmail_connections
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 3. gmail_messages (Normalized hiring communications)
CREATE TABLE IF NOT EXISTS public.gmail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id VARCHAR(128) NOT NULL,
  thread_id VARCHAR(128) NOT NULL,
  
  -- Sender & Subject
  sender_raw TEXT NOT NULL,
  sender_email VARCHAR(256) NOT NULL,
  sender_name VARCHAR(256),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL,
  snippet TEXT,
  safe_body_plain TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  
  -- Hiring Classification
  classification hiring_email_classification_enum NOT NULL DEFAULT 'NOT_HIRING',
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
  classification_reason TEXT,
  
  -- Extracted Structured Intelligence
  extracted_company VARCHAR(256),
  extracted_role VARCHAR(256),
  extracted_interview_details JSONB,
  extracted_offer_details JSONB,
  extracted_action_required TEXT,

  -- Application Association
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  matched_by VARCHAR(64), -- 'EXACT_EXTERNAL_ID', 'COMPANY_AND_TITLE', 'DOMAIN', 'AI_MATCH', 'UNMATCHED'
  is_human_verified BOOLEAN NOT NULL DEFAULT false,

  -- Task Link
  human_task_id UUID REFERENCES public.human_tasks(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_gmail_messages_user_msg UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_messages_user_id ON public.gmail_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_classification ON public.gmail_messages(classification);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_app_id ON public.gmail_messages(application_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_received_at ON public.gmail_messages(received_at);

ALTER TABLE public.gmail_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gmail_messages' AND policyname = 'Users can view and manage their own gmail messages'
  ) THEN
    CREATE POLICY "Users can view and manage their own gmail messages"
      ON public.gmail_messages
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 4. gmail_sync_runs (Persistent log of synchronization sessions)
CREATE TABLE IF NOT EXISTS public.gmail_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_status gmail_sync_status_enum NOT NULL DEFAULT 'RUNNING',
  messages_scanned INTEGER NOT NULL DEFAULT 0,
  hiring_messages_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gmail_sync_runs_user_id ON public.gmail_sync_runs(user_id);

ALTER TABLE public.gmail_sync_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gmail_sync_runs' AND policyname = 'Users can view their own gmail sync runs'
  ) THEN
    CREATE POLICY "Users can view their own gmail sync runs"
      ON public.gmail_sync_runs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;
