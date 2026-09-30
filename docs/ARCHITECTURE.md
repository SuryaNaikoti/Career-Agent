# Career Agent — Technical Architecture

## 1. System Overview
Career Agent is architected as a modular, full-stack application built for fast mobile rendering, high reliability, and clean separation between presentation, business rules, and future persistence/AI layers.

```
[ Mobile PWA Client (React + TS + Tailwind) ]
                     │  (Fetch / Bearer Auth)
                     ▼
[ Express API Gateway (/api/*) & Vite Middleware ]
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
[ Auth Core ]  [ Permission ]  [ AI Orchestrator ]
(Supabase M01) (AUTO/CONFIRM/  (Gemini API M10)
                DENY Engine)
     │               │               │
     ▼               ▼               ▼
[ PostgreSQL / Supabase DB ]   [ External Feeds & Gmail ]
```

## 2. Directory Structure Conventions
- `src/app/`: Core App setup, router provider, layouts.
- `src/features/authentication/`: Authentication service, context provider, validation, types, and hooks.
- `src/lib/supabase/`: Centralized Supabase browser client abstraction.
- `src/pages/`: Route-level screens (home, jobs, applications, agent, profile, install, auth, onboarding).
- `src/components/`: Reusable, composable UI blocks (ui, navigation, auth, pwa, jobs, applications, agent).
- `src/types/`: Strict TypeScript interfaces for domain entities.
- `src/styles/`: Design tokens and global CSS.
- `mock/demo-data/`: Strictly isolated mock data layers for visual development. Never imported in production services.
- `server/`: Server runtime, logger, security context, token-based authorization middleware (`/api/auth/me`), and API endpoints.
- `docs/`: System documentation and architectural specifications.

## 3. Authentication Architecture (Module 01)
- **Authority:** Supabase Auth is the authority for user credentials, email confirmation, password hashing, and session refresh tokens.
- **Provider Wrapper:** `<AuthProvider>` wraps the router to provide reactive session state without flashing login screens.
- **Route Guarding:** Protected routes (`/app/*`, `/onboarding`) enforce authentication and preserve internal redirect parameters.
- **Server Guarding:** `requireAuth` middleware verifies `Authorization: Bearer <token>` through Supabase server client before permitting access to user resources.

## 4. PWA Architecture
- `manifest.webmanifest`: Meets Chromium and WebKit installability standards (id, standalone, icons, theme color).
- Service worker (`public/sw.js`): Safe static caching; bypasses private API and user session routes.
- In-app install banner with explicit iOS Safari fallback guide.
