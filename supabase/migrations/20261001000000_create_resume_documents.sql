-- ==============================================================================
-- CAREER AGENT — RESUME DOCUMENTS MIGRATION (MODULE 04)
-- Schema: resume_documents
-- 
-- Rules:
-- 1. UUID primary keys
-- 2. Direct user ownership via auth.users.id
-- 3. Strict Row Level Security (RLS) for every table
-- 4. Status tracking: UPLOADED, VALIDATING, EXTRACTING, PARSING, REVIEW_REQUIRED, COMPLETED, FAILED, DELETED
-- 5. Storage path convention: resumes/{user_id}/{resume_id}/original.{ext}
-- ==============================================================================

-- Resume processing status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resume_status') THEN
    CREATE TYPE resume_status AS ENUM (
      'UPLOADED',
      'VALIDATING',
      'EXTRACTING',
      'PARSING',
      'REVIEW_REQUIRED',
      'COMPLETED',
      'FAILED',
      'DELETED'
    );
  END IF;
END$$;

-- Resume processing stage enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resume_processing_stage') THEN
    CREATE TYPE resume_processing_stage AS ENUM (
      'UPLOAD',
      'VALIDATION',
      'EXTRACTION',
      'NORMALIZATION',
      'AI_PARSING',
      'EVIDENCE_VALIDATION',
      'REVIEW',
      'PERSISTENCE'
    );
  END IF;
END$$;

-- ==============================================================================
-- 1. resume_documents Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.resume_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256 VARCHAR(64) NOT NULL,
  status resume_status NOT NULL DEFAULT 'UPLOADED',
  processing_stage resume_processing_stage NOT NULL DEFAULT 'UPLOAD',
  error_code TEXT,
  error_message_safe TEXT,
  document_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  parsed_data JSONB,
  evidence_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ
);

-- Indexes for rapid lookups and user isolation
CREATE INDEX IF NOT EXISTS idx_resume_documents_user_id ON public.resume_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_documents_status ON public.resume_documents(status);

-- Enable RLS
ALTER TABLE public.resume_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own resume documents" ON public.resume_documents;
DROP POLICY IF EXISTS "Users can insert own resume documents" ON public.resume_documents;
DROP POLICY IF EXISTS "Users can update own resume documents" ON public.resume_documents;
DROP POLICY IF EXISTS "Users can delete own resume documents" ON public.resume_documents;

-- RLS Policies: Authenticated user owns their resume documents strictly
CREATE POLICY "Users can view own resume documents"
  ON public.resume_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resume documents"
  ON public.resume_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resume documents"
  ON public.resume_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resume documents"
  ON public.resume_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
-- ==============================================================================
-- 2. Storage Bucket: 'resumes' (Private) & Storage RLS Policies
-- ==============================================================================

-- Create private bucket 'resumes' if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- storage.objects has RLS enabled by Supabase by default

-- Drop existing storage policies if re-running
DROP POLICY IF EXISTS "Users can read own resume files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own resume files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume files" ON storage.objects;

-- Policy 1: SELECT (Read) — Users can only read files inside their own user_id directory
CREATE POLICY "Users can read own resume files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: INSERT (Upload) — Users can only upload files into their own user_id directory
CREATE POLICY "Users can upload own resume files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: UPDATE — Users can only update files in their own user_id directory
CREATE POLICY "Users can update own resume files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: DELETE — Users can only delete files in their own user_id directory
CREATE POLICY "Users can delete own resume files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
