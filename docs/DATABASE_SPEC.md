# Future Database Specification (Supabase PostgreSQL + pgvector)

*Note: Database provisioning will take place in subsequent modules. Do NOT provision Firebase or alter this intended architecture.*

## 1. Primary Relational Schema Plan

### `candidates`
- `id`: uuid (Primary Key, matches `auth.users.id`)
- `name`: text not null
- `email`: text unique not null
- `headline`: text
- `experience_years`: numeric(4,1)
- `created_at`: timestamptz default now()
- `updated_at`: timestamptz default now()

### `candidate_resumes`
- `id`: uuid (Primary Key)
- `candidate_id`: uuid (Foreign Key -> `candidates.id`)
- `file_url`: text
- `parsed_text`: text
- `verified_skills`: text[]
- `embedding`: vector(1536) -- for semantic matching
- `is_primary`: boolean default true

### `candidate_preferences`
- `id`: uuid (Primary Key)
- `candidate_id`: uuid (Foreign Key -> `candidates.id`)
- `target_roles`: text[]
- `locations`: text[]
- `min_salary`: numeric(12,2)
- `currency`: varchar(3) default 'INR'
- `work_modes`: text[] -- ['Remote', 'Hybrid', 'On-site']

### `jobs`
- `id`: uuid (Primary Key)
- `title`: text not null
- `company`: text not null
- `location`: text
- `work_mode`: text
- `salary_min`: numeric(12,2)
- `salary_max`: numeric(12,2)
- `description`: text
- `skills_required`: text[]
- `embedding`: vector(1536)
- `source`: text
- `source_url`: text
- `posted_at`: timestamptz

### `applications`
- `id`: uuid (Primary Key)
- `candidate_id`: uuid (Foreign Key -> `candidates.id`)
- `job_id`: uuid (Foreign Key -> `jobs.id`)
- `status`: text not null -- ('Ready', 'Submitted', 'Interview', etc.)
- `match_score`: integer
- `tailored_resume_url`: text
- `cover_letter_text`: text
- `application_code`: text
- `submitted_at`: timestamptz
- `created_at`: timestamptz default now()

### `human_tasks`
- `id`: uuid (Primary Key)
- `candidate_id`: uuid (Foreign Key -> `candidates.id`)
- `application_id`: uuid (Foreign Key -> `applications.id`)
- `task_type`: text
- `question`: text
- `answer`: text
- `is_completed`: boolean default false

## 2. Row Level Security (RLS) Strategy
- `candidates`: `auth.uid() = id` (Candidates may only read and write their own profile).
- `applications`: `auth.uid() = candidate_id` (Candidates may only read and modify their own applications).
- `jobs`: Public read access for indexed jobs.
