# Career Agent — Technical Architecture

*Status: FOUNDATION ESTABLISHED (Module 00)*

## 1. System Overview
Career Agent is architected as a modular, mobile-first full-stack application built for high reliability, deterministic execution, and clean separation between presentation, security, business logic, and future AI orchestration.

```
[ Mobile PWA Client (React + TS + Tailwind v4) ]
                     │  (HTTPS / Bearer Auth)
                     ▼
[ Express API Gateway (/api/*) & Vite Middleware ]
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
[ Auth Core ]  [ Permission ]  [ AI Orchestrator ]
(Supabase M01) (AUTO/CONFIRM/  (Gemini API M08)
                DENY Engine)
     │               │               │
     ▼               ▼               ▼
[ PostgreSQL / Supabase DB ]   [ External Feeds & Gmail ]
```

---

## 2. Directory Structure Conventions

```
src/
├── app/          # Micro-router, layouts (AppLayout), route coordinator
├── components/   # Modular UI, navigation, PWA, and domain presentational components
├── features/     # Feature-encapsulated modules (authentication context, services)
├── pages/        # Route page controllers
├── hooks/        # React hooks
├── lib/          # Client-side library wrappers (Supabase browser client)
├── types/        # TypeScript domain contracts & Candidate Truth Layer types
└── styles/       # CSS tokens and styling utilities

server/
├── api/          # Express route definitions (/api/health, /api/auth)
├── core/         # Core system utilities
│   ├── ai/          # Orchestrator contracts & tool definitions
│   ├── auth/        # Server auth abstractions and re-exports
│   ├── errors/      # Standardized AppError hierarchy
│   ├── logging/     # System logger
│   ├── permissions/ # AUTO / CONFIRM / DENY permission engine
│   └── security/    # Bearer token verification and requireAuth middleware
├── services/     # Server-side business service layer
└── index.ts      # Express application factory & API router

supabase/
└── migrations/   # Declarative PostgreSQL DDL migrations & RLS policies

mock/
└── demo-data/    # Strictly isolated development-only demo datasets

docs/             # Architectural specifications, security guidelines, and module plans
```

---

## 3. Package Management Standard
- **Standardized Manager:** **Node.js (v20+ LTS) + npm**
- **Strict Rule:** Bun lockfiles or alternate package managers are prohibited to maintain reproducible CI/CD builds across Docker, Cloud Run, and VPS environments.
- Peer dependencies (such as Vite 8 and esbuild ^0.28.0) are resolved at the version manifest level without relying on `--legacy-peer-deps`.

---

## 4. Environment & Secret Boundaries
- **PUBLIC:** Variables starting with `VITE_` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are bundled into client code.
- **SERVER ONLY:** Secrets (`SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`) remain strictly on the backend and are never exposed to client bundles or Vite build outputs.

---

## 5. Security Architecture
- **Bearer Token Verification:** The server middleware extracts the JWT from `Authorization: Bearer <token>` and validates it with Supabase.
- **No Client Trust:** Client-supplied `user_id` or `email` values in request bodies or query parameters are never trusted for authorization. Identity is derived strictly from the verified session token.
- **Row Level Security:** Every candidate-owned PostgreSQL table restricts access strictly to `auth.uid() = user_id`.

---

## 6. Implementation Status Matrix

| Component / Layer | Status | Description |
| :--- | :---: | :--- |
| **Mobile PWA Shell** | **IMPLEMENTED** | Standalone mode, safe caching, iOS guides |
| **Supabase Authentication** | **IMPLEMENTED** | Sign up, sign in, OAuth trigger, reset flow |
| **Server Security & Auth Middleware** | **IMPLEMENTED** | Token verification, `/api/auth/me` |
| **Candidate Foundation Schema** | **FOUNDATION** | PostgreSQL DDL & RLS for candidate tables |
| **Candidate Truth Layer Types** | **FOUNDATION** | Provenance tagging for fact integrity |
| **Candidate Onboarding** | **MOCK / PLANNED** | Step UI shell; real form engine deferred to Module 02 |
| **Job Discovery & Matching** | **MOCK / PLANNED** | Demo jobs array; external feeds deferred to Module 04-05 |
| **Gemini AI Orchestrator** | **PLANNED** | Type contracts established; live SDK deferred to Module 08 |
| **Gmail Sync & Automation** | **PLANNED** | Read-only OAuth sync deferred to Module 10 |
