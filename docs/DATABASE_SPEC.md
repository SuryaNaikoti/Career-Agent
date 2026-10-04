# Database Specification (Supabase PostgreSQL + pgvector)

*Status: FOUNDATION ESTABLISHED (Module 00)*

## 1. Terminology Standard
All candidate profiles are stored in the canonical table **`candidate_profiles`** (never `candidates`), with direct ownership linked to Supabase authentication identity (`auth.users.id`).

---

## 2. Implemented Foundation Schema (Migration `20260930000000_create_candidate_foundation.sql`)

### `candidate_profiles` [FOUNDATION]
- `id`: UUID (Primary Key, default `gen_random_uuid()`)
- `user_id`: UUID (Unique Foreign Key -> `auth.users.id` ON DELETE CASCADE)
- `display_name`: TEXT NOT NULL
- `headline`: TEXT
- `career_goal`: TEXT
- `target_roles`: TEXT[] DEFAULT '{}'
- `total_experience_years`: NUMERIC(4, 1) DEFAULT 0.0
- `preferred_locations`: TEXT[] DEFAULT '{}'
- `work_modes`: TEXT[] DEFAULT '{}'
- `expected_salary_min`: NUMERIC(12, 2)
- `expected_salary_max`: NUMERIC(12, 2)
- `currency`: VARCHAR(3) DEFAULT 'INR'
- `work_authorization`: TEXT
- `provenance`: `fact_provenance` ENUM ('CANDIDATE_PROVIDED', 'CANDIDATE_CONFIRMED', 'AI_SUGGESTED', 'UNKNOWN')
- `metadata`: JSONB DEFAULT '{}'::jsonb
- `created_at`: TIMESTAMPTZ DEFAULT timezone('utc', now())
- `updated_at`: TIMESTAMPTZ DEFAULT timezone('utc', now())

### `candidate_skills` [FOUNDATION]
- `id`: UUID PRIMARY KEY
- `profile_id`: UUID REFERENCES `candidate_profiles.id` ON DELETE CASCADE
- `user_id`: UUID REFERENCES `auth.users.id` ON DELETE CASCADE
- `skill_name`: TEXT NOT NULL
- `years_of_experience`: NUMERIC(4, 1)
- `proficiency_level`: TEXT ('beginner', 'intermediate', 'expert')
- `provenance`: `fact_provenance` ENUM
- `created_at`, `updated_at`: TIMESTAMPTZ

### `candidate_experience` [FOUNDATION]
- `id`: UUID PRIMARY KEY
- `profile_id`: UUID REFERENCES `candidate_profiles.id` ON DELETE CASCADE
- `user_id`: UUID REFERENCES `auth.users.id` ON DELETE CASCADE
- `company`: TEXT NOT NULL
- `role_title`: TEXT NOT NULL
- `start_date`: DATE
- `end_date`: DATE
- `is_current`: BOOLEAN DEFAULT false
- `description`: TEXT
- `skills_used`: TEXT[] DEFAULT '{}'
- `provenance`: `fact_provenance` ENUM
- `created_at`, `updated_at`: TIMESTAMPTZ

### `candidate_education` [FOUNDATION]
- `id`: UUID PRIMARY KEY
- `profile_id`: UUID REFERENCES `candidate_profiles.id` ON DELETE CASCADE
- `user_id`: UUID REFERENCES `auth.users.id` ON DELETE CASCADE
- `institution`: TEXT NOT NULL
- `degree`: TEXT NOT NULL
- `field_of_study`: TEXT
- `start_date`: DATE
- `end_date`: DATE
- `provenance`: `fact_provenance` ENUM
- `created_at`, `updated_at`: TIMESTAMPTZ

### `candidate_preferences` [FOUNDATION]
- `id`: UUID PRIMARY KEY
- `profile_id`: UUID UNIQUE REFERENCES `candidate_profiles.id` ON DELETE CASCADE
- `user_id`: UUID REFERENCES `auth.users.id` ON DELETE CASCADE
- `target_roles`: TEXT[] DEFAULT '{}'
- `locations`: TEXT[] DEFAULT '{}'
- `work_modes`: TEXT[] DEFAULT '{}'
- `min_salary`: NUMERIC(12, 2)
- `currency`: VARCHAR(3) DEFAULT 'INR'
- `benefits_preferred`: TEXT[] DEFAULT '{}'
- `companies_targeted`: TEXT[] DEFAULT '{}'
- `companies_excluded`: TEXT[] DEFAULT '{}'
- `provenance`: `fact_provenance` ENUM
- `created_at`, `updated_at`: TIMESTAMPTZ

---

## 3. Candidate Truth Layer: Provenance Engine
Every candidate fact carries an explicit provenance tag:
1. `CANDIDATE_PROVIDED`: Explicitly entered by the candidate.
2. `CANDIDATE_CONFIRMED`: Verified or approved by candidate action.
3. `AI_SUGGESTED`: Suggested or rephrased by AI orchestrator. **NEVER automatically elevated to verified candidate fact without explicit confirmation.**
4. `UNKNOWN`: Unverified or unconfirmed legacy datum.

---

## 4. Planned Future Entities (Modules 02 - 10) [PLANNED]
- `candidate_resumes`: Resume storage URL, raw parsed text, embedding vector(1536).
- `jobs`: Discovered and normalized opportunities with vector embeddings.
- `job_sources`: Feed adapters, platforms, and API sync states.
- `applications`: End-to-end application lifecycle tracking.
- `application_documents`: Tailored resumes and cover letters.
- `application_tasks`: Human confirmation prompts and questionnaire answers.
- `email_accounts` / `email_messages`: Gmail sync state.
- `agent_runs` / `agent_actions`: Autonomous execution audits.

---

## 5. Row Level Security (RLS) Policies
- All candidate-owned tables enforce RLS:
  - `SELECT`: `auth.uid() = user_id`
  - `INSERT`: `auth.uid() = user_id`
  - `UPDATE`: `auth.uid() = user_id`
  - `DELETE`: `auth.uid() = user_id`
- Client-supplied `user_id` parameters are never trusted in security contexts.
