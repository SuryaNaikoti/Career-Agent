-- ========================================================================
-- Module 12: Notifications & Daily Career Report Migration
-- Tables:
-- 1. daily_career_reports: Stores deterministic summary facts and optional AI narrative
-- 2. career_report_preferences: User notification & report scheduling preferences
-- 3. internal_notifications: In-app notification center items with deduplication
--
-- Security:
-- Row-Level Security (RLS) enabled on all tables enforcing auth.uid() = user_id
-- ========================================================================

-- Notification types enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
    CREATE TYPE public.notification_type_enum AS ENUM (
      'DAILY_REPORT',
      'ACTION_REQUIRED',
      'INTERVIEW',
      'ASSESSMENT',
      'OFFER',
      'APPLICATION_UPDATE',
      'SYSTEM'
    );
  END IF;
END $$;

-- Notification status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status_enum') THEN
    CREATE TYPE public.notification_status_enum AS ENUM (
      'UNREAD',
      'READ'
    );
  END IF;
END $$;

-- 1. Daily Career Reports Table
CREATE TABLE IF NOT EXISTS public.daily_career_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  summary_data JSONB NOT NULL,
  generated_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_daily_career_reports_user_date UNIQUE (user_id, report_date, timezone)
);

CREATE INDEX IF NOT EXISTS idx_daily_career_reports_user_date 
  ON public.daily_career_reports (user_id, report_date DESC);

-- 2. Career Report Preferences Table
CREATE TABLE IF NOT EXISTS public.career_report_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_report_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_report_time VARCHAR(8) NOT NULL DEFAULT '08:00',
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  in_app_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_career_report_preferences_user 
  ON public.career_report_preferences (user_id);

-- 3. Internal Notifications Table
CREATE TABLE IF NOT EXISTS public.internal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type public.notification_type_enum NOT NULL,
  status public.notification_status_enum NOT NULL DEFAULT 'UNREAD',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  deduplication_key VARCHAR(128) NOT NULL,
  
  -- Referenced entities (minimal, non-duplicative references)
  application_id UUID,
  job_id UUID,
  task_id UUID,
  hiring_message_id UUID,
  report_id UUID REFERENCES public.daily_career_reports(id) ON DELETE SET NULL,
  
  action_url VARCHAR(512),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_internal_notifications_dedup UNIQUE (user_id, deduplication_key)
);

CREATE INDEX IF NOT EXISTS idx_internal_notifications_user_status 
  ON public.internal_notifications (user_id, status, created_at DESC);

-- ========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict isolation: candidates can ONLY access their own records
-- ========================================================================

ALTER TABLE public.daily_career_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_report_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;

-- 1. daily_career_reports RLS
DROP POLICY IF EXISTS "Users can view own daily career reports" ON public.daily_career_reports;
CREATE POLICY "Users can view own daily career reports"
  ON public.daily_career_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily career reports" ON public.daily_career_reports;
CREATE POLICY "Users can insert own daily career reports"
  ON public.daily_career_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily career reports" ON public.daily_career_reports;
CREATE POLICY "Users can update own daily career reports"
  ON public.daily_career_reports FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. career_report_preferences RLS
DROP POLICY IF EXISTS "Users can view own career report preferences" ON public.career_report_preferences;
CREATE POLICY "Users can view own career report preferences"
  ON public.career_report_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own career report preferences" ON public.career_report_preferences;
CREATE POLICY "Users can insert own career report preferences"
  ON public.career_report_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own career report preferences" ON public.career_report_preferences;
CREATE POLICY "Users can update own career report preferences"
  ON public.career_report_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. internal_notifications RLS
DROP POLICY IF EXISTS "Users can view own internal notifications" ON public.internal_notifications;
CREATE POLICY "Users can view own internal notifications"
  ON public.internal_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own internal notifications" ON public.internal_notifications;
CREATE POLICY "Users can insert own internal notifications"
  ON public.internal_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own internal notifications" ON public.internal_notifications;
CREATE POLICY "Users can update own internal notifications"
  ON public.internal_notifications FOR UPDATE
  USING (auth.uid() = user_id);
