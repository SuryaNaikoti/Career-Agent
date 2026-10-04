# Career Agent — Module Build Sequence & Status Matrix

*Current Milestone: MODULE 01 (Candidate Data Service & Truth Layer)*

Every module is built sequentially and must pass strict validation before advancement:

| Module | Scope / Title | Status | Description |
| :--- | :--- | :---: | :--- |
| **Module 00** | **Foundation Normalization & Architecture Baseline** | **IMPLEMENTED** | Node/npm standardization, clean dependency graph, PostgreSQL foundation schema (`candidate_profiles`, `skills`, `experience`, `education`, `preferences`), Candidate Truth Layer types, RLS policies, Express server baseline, health check. |
| **Module 01** | **Candidate Data Service & Truth Layer** | **IMPLEMENTED** | Authenticated candidate CRUD service layer (`profile`, `skills`, `experience`, `education`, `preferences`), rigorous input/temporal validation, Candidate Truth Layer provenance enforcement, defense-in-depth resource ownership checking, and client API service. |
| **Module 02** | **Interactive Candidate Onboarding** | **PLANNED** | Replace placeholder onboarding wizard with interactive intake forms storing real structured data in PostgreSQL. |
| **Module 03** | **Resume Storage & Parsing Pipeline** | **PLANNED** | Supabase Storage bucket, PDF/Docx parser, extracted skill mapping with provenance tagging. |
| **Module 04** | **Job Ingestion & Normalization Service** | **PLANNED** | External job board feeds, schema normalization, database storage for `jobs`, deduplication. |
| **Module 05** | **Deterministic & Semantic Matching Engine** | **PLANNED** | Skill overlap algorithms, pgvector semantic search, match scoring breakdowns with gap explanations. |
| **Module 06** | **Application Tracking & Human Tasks** | **PLANNED** | Application lifecycle state machine (`DISCOVERED` -> `SUBMITTED` -> `INTERVIEW`), human confirmation review queues. |
| **Module 07** | **Server-Side Gemini AI Orchestrator** | **PLANNED** | `@google/genai` integration with structured outputs, permission engine enforcement, and controlled tool registry. |
| **Module 08** | **Autonomous Career Agent Screen** | **PLANNED** | Interactive chat UI connected to server AI orchestrator for guided search and application prep. |
| **Module 09** | **Gmail Hiring Sync (Read-Only)** | **PLANNED** | Authorized Google OAuth, recruiter communication detection, automatic application status updates. |
| **Module 10** | **Scheduled Jobs & Daily Career Reports** | **PLANNED** | Cron-driven autonomous job scanning and daily career digests. |
| **Module 11** | **Subscription & Monetization Gateways** | **PLANNED** | Tiered usage limits, premium quotas, and billing. |
