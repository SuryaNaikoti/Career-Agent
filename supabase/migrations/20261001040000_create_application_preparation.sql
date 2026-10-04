-- ==============================================================================
-- CAREER AGENT — APPLICATION PREPARATION MIGRATION (MODULE 08)
-- Schema: application_preparations, application_preparation_versions,
--         application_review_items, application_preparation_evidence
-- 
-- Principles:
-- 1. UUID primary keys
-- 2. Direct user ownership via auth.users.id
-- 3. Strict Row Level Security (RLS) ensuring auth.uid() = user_id
-- 4. Preparation state machine:
--    DRAFT, PREPARING, REVIEW_REQUIRED, READY_FOR_APPLICATION, STALE, FAILED
-- 5. Immutable preparation versions:
--    Input snapshots, tailored resume, tailored cover letter, application answers
-- 6. Canonical jobs & candidate profile remain read-only; never mutated by preparation
-- 7. ZERO submission records created here (Submission strictly belongs to Module 09)
-- ==============================================================================

-- Preparation status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preparation_status_enum') THEN
    CREATE TYPE preparation_status_enum AS ENUM (
      'DRAFT',
      'PREPARING',
      'REVIEW_REQUIRED',
      'READY_FOR_APPLICATION',
      'STALE',
      'FAILED'
    );
  END IF;
END$$;

-- Review item type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_item_type_enum') THEN
    CREATE TYPE review_item_type_enum AS ENUM (
      'MISSING_INFORMATION',
      'CONFIRM_CANDIDATE_FACT',
      'UNSUPPORTED_CLAIM',
      'QUESTION_ANSWER_REQUIRED'
    );
  END IF;
END$$;

-- Review item status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_item_status_enum') THEN
    CREATE TYPE review_item_status_enum AS ENUM (
      'PENDING',
      'RESOLVED',
      'REJECTED',
      'DISMISSED'
    );
  END IF;
END$$;

-- Evidence source type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_source_type_enum') THEN
    CREATE TYPE evidence_source_type_enum AS ENUM (
      'CANDIDATE_PROFILE',
      'CANDIDATE_SKILL',
      'CANDIDATE_EXPERIENCE',
      'CANDIDATE_EDUCATION',
      'CANDIDATE_PREFERENCES',
      'RESUME_FACT',
      'CANDIDATE_CONFIRMED_RESPONSE'
    );
  END IF;
END$$;

-- Evidence validation status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_validation_status_enum') THEN
    CREATE TYPE evidence_validation_status_enum AS ENUM (
      'VERIFIED_CONFIRMED',
      'VERIFIED_PROVIDED',
      'REQUIRES_CONFIRMATION',
      'UNSUPPORTED'
    );
  END IF;
END$$;

-- ==============================================================================
-- 1. application_preparations (Top-level preparation tracker per candidate & job)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_preparations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  current_version_id UUID, -- References active application_preparation_versions(id)
  status preparation_status_enum NOT NULL DEFAULT 'DRAFT',
  readiness_score NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  is_ready_for_application BOOLEAN NOT NULL DEFAULT false,
  blocking_review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_application_preparations_user_job UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_application_preparations_user_id ON public.application_preparations(user_id);
CREATE INDEX IF NOT EXISTS idx_application_preparations_job_id ON public.application_preparations(job_id);
CREATE INDEX IF NOT EXISTS idx_application_preparations_status ON public.application_preparations(status);

-- ==============================================================================
-- 2. application_preparation_versions (Immutable snapshot versions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_preparation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id UUID NOT NULL REFERENCES public.application_preparations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  
  -- Input Snapshot Hash / References
  job_snapshot_hash VARCHAR(64) NOT NULL,
  candidate_snapshot_hash VARCHAR(64) NOT NULL,
  resume_id UUID REFERENCES public.resume_documents(id) ON DELETE SET NULL,
  matching_score NUMERIC(5, 2),
  matching_version VARCHAR(32),

  -- Structured Generated Artifacts
  tailored_resume JSONB NOT NULL DEFAULT '{}'::jsonb,
  tailored_cover_letter JSONB NOT NULL DEFAULT '{}'::jsonb,
  application_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status & Readiness snapshot
  status preparation_status_enum NOT NULL DEFAULT 'DRAFT',
  is_ready_for_application BOOLEAN NOT NULL DEFAULT false,
  summary_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_preparation_versions_prep_num UNIQUE (preparation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_prep_versions_prep_id ON public.application_preparation_versions(preparation_id);
CREATE INDEX IF NOT EXISTS idx_prep_versions_user_id ON public.application_preparation_versions(user_id);

-- Foreign key update on application_preparations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_prep_current_version'
  ) THEN
    ALTER TABLE public.application_preparations
      ADD CONSTRAINT fk_app_prep_current_version
      FOREIGN KEY (current_version_id)
      REFERENCES public.application_preparation_versions(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- ==============================================================================
-- 3. application_review_items (Human Tasks & Discrepancies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id UUID NOT NULL REFERENCES public.application_preparations(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.application_preparation_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type review_item_type_enum NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_field TEXT,
  blocking BOOLEAN NOT NULL DEFAULT true,
  status review_item_status_enum NOT NULL DEFAULT 'PENDING',
  proposed_answer TEXT,
  candidate_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_review_items_prep_id ON public.application_review_items(preparation_id);
CREATE INDEX IF NOT EXISTS idx_review_items_user_id ON public.application_review_items(user_id);
CREATE INDEX IF NOT EXISTS idx_review_items_status ON public.application_review_items(status);

-- ==============================================================================
-- 4. application_preparation_evidence (Claim-to-Source Provenance Map)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.application_preparation_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preparation_id UUID NOT NULL REFERENCES public.application_preparations(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.application_preparation_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_type VARCHAR(32) NOT NULL, -- 'RESUME', 'COVER_LETTER', 'APPLICATION_ANSWER'
  claim_text TEXT NOT NULL,
  source_type evidence_source_type_enum NOT NULL,
  source_id TEXT,
  source_field TEXT,
  truth_state fact_provenance NOT NULL,
  validation_status evidence_validation_status_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_prep_evidence_prep_id ON public.application_preparation_evidence(preparation_id);
CREATE INDEX IF NOT EXISTS idx_prep_evidence_user_id ON public.application_preparation_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_prep_evidence_status ON public.application_preparation_evidence(validation_status);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- Candidates may only SELECT, INSERT, UPDATE, DELETE their own preparation data.
-- ==============================================================================
ALTER TABLE public.application_preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_preparation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_preparation_evidence ENABLE ROW LEVEL SECURITY;

-- application_preparations policies
DROP POLICY IF EXISTS "Users can view own application preparations" ON public.application_preparations;
CREATE POLICY "Users can view own application preparations"
  ON public.application_preparations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own application preparations" ON public.application_preparations;
CREATE POLICY "Users can insert own application preparations"
  ON public.application_preparations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own application preparations" ON public.application_preparations;
CREATE POLICY "Users can update own application preparations"
  ON public.application_preparations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own application preparations" ON public.application_preparations;
CREATE POLICY "Users can delete own application preparations"
  ON public.application_preparations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- application_preparation_versions policies
DROP POLICY IF EXISTS "Users can view own preparation versions" ON public.application_preparation_versions;
CREATE POLICY "Users can view own preparation versions"
  ON public.application_preparation_versions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preparation versions" ON public.application_preparation_versions;
CREATE POLICY "Users can insert own preparation versions"
  ON public.application_preparation_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- application_review_items policies
DROP POLICY IF EXISTS "Users can view own review items" ON public.application_review_items;
CREATE POLICY "Users can view own review items"
  ON public.application_review_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own review items" ON public.application_review_items;
CREATE POLICY "Users can insert own review items"
  ON public.application_review_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own review items" ON public.application_review_items;
CREATE POLICY "Users can update own review items"
  ON public.application_review_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- application_preparation_evidence policies
DROP POLICY IF EXISTS "Users can view own preparation evidence" ON public.application_preparation_evidence;
CREATE POLICY "Users can view own preparation evidence"
  ON public.application_preparation_evidence FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preparation evidence" ON public.application_preparation_evidence;
CREATE POLICY "Users can insert own preparation evidence"
  ON public.application_preparation_evidence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
