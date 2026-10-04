-- ==============================================================================
-- CAREER AGENT — FOUNDATION MIGRATION (MODULE 00)
-- Schema: candidate_profiles, candidate_skills, candidate_experience,
--         candidate_education, candidate_preferences
-- 
-- Rules:
-- 1. UUID primary keys
-- 2. Direct user ownership via auth.users.id
-- 3. Strict Row Level Security (RLS) for every table
-- 4. Candidate Truth Layer provenance:
--    CANDIDATE_PROVIDED, CANDIDATE_CONFIRMED, AI_SUGGESTED, UNKNOWN
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fact provenance enum for Candidate Truth Layer
CREATE TYPE fact_provenance AS ENUM (
  'CANDIDATE_PROVIDED',
  'CANDIDATE_CONFIRMED',
  'AI_SUGGESTED',
  'UNKNOWN'
);

-- ==============================================================================
-- 1. candidate_profiles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT,
  career_goal TEXT,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  total_experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  work_modes TEXT[] NOT NULL DEFAULT '{}',
  expected_salary_min NUMERIC(12, 2),
  expected_salary_max NUMERIC(12, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  work_authorization TEXT,
  provenance fact_provenance NOT NULL DEFAULT 'CANDIDATE_PROVIDED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for rapid user lookup
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON public.candidate_profiles(user_id);

-- Enable RLS
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated user owns their profile
CREATE POLICY "Users can view own candidate profile"
  ON public.candidate_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate profile"
  ON public.candidate_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate profile"
  ON public.candidate_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidate profile"
  ON public.candidate_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 2. candidate_skills
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  years_of_experience NUMERIC(4, 1),
  proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert')),
  provenance fact_provenance NOT NULL DEFAULT 'CANDIDATE_PROVIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_skills_unique_skill UNIQUE (profile_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_candidate_skills_profile_id ON public.candidate_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_user_id ON public.candidate_skills(user_id);

ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own candidate skills"
  ON public.candidate_skills
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate skills"
  ON public.candidate_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate skills"
  ON public.candidate_skills
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidate skills"
  ON public.candidate_skills
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. candidate_experience
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role_title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  skills_used TEXT[] NOT NULL DEFAULT '{}',
  provenance fact_provenance NOT NULL DEFAULT 'CANDIDATE_PROVIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_candidate_experience_profile_id ON public.candidate_experience(profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_experience_user_id ON public.candidate_experience(user_id);

ALTER TABLE public.candidate_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own candidate experience"
  ON public.candidate_experience
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate experience"
  ON public.candidate_experience
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate experience"
  ON public.candidate_experience
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidate experience"
  ON public.candidate_experience
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. candidate_education
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  start_date DATE,
  end_date DATE,
  provenance fact_provenance NOT NULL DEFAULT 'CANDIDATE_PROVIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_candidate_education_profile_id ON public.candidate_education(profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_education_user_id ON public.candidate_education(user_id);

ALTER TABLE public.candidate_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own candidate education"
  ON public.candidate_education
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate education"
  ON public.candidate_education
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate education"
  ON public.candidate_education
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidate education"
  ON public.candidate_education
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. candidate_preferences
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.candidate_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  locations TEXT[] NOT NULL DEFAULT '{}',
  work_modes TEXT[] NOT NULL DEFAULT '{}',
  min_salary NUMERIC(12, 2),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  benefits_preferred TEXT[] NOT NULL DEFAULT '{}',
  companies_targeted TEXT[] NOT NULL DEFAULT '{}',
  companies_excluded TEXT[] NOT NULL DEFAULT '{}',
  provenance fact_provenance NOT NULL DEFAULT 'CANDIDATE_PROVIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_candidate_preferences_profile_id ON public.candidate_preferences(profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_preferences_user_id ON public.candidate_preferences(user_id);

ALTER TABLE public.candidate_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own candidate preferences"
  ON public.candidate_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate preferences"
  ON public.candidate_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate preferences"
  ON public.candidate_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidate preferences"
  ON public.candidate_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for auto-updating timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_candidate_profiles_updated_at ON public.candidate_profiles;
CREATE TRIGGER set_candidate_profiles_updated_at
  BEFORE UPDATE ON public.candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_candidate_skills_updated_at ON public.candidate_skills;
CREATE TRIGGER set_candidate_skills_updated_at
  BEFORE UPDATE ON public.candidate_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_candidate_experience_updated_at ON public.candidate_experience;
CREATE TRIGGER set_candidate_experience_updated_at
  BEFORE UPDATE ON public.candidate_experience
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_candidate_education_updated_at ON public.candidate_education;
CREATE TRIGGER set_candidate_education_updated_at
  BEFORE UPDATE ON public.candidate_education
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_candidate_preferences_updated_at ON public.candidate_preferences;
CREATE TRIGGER set_candidate_preferences_updated_at
  BEFORE UPDATE ON public.candidate_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
