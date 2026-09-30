# Security Specification & Boundaries

## 1. Secrets & Credentials Isolation
- **Server-Only Secrets:** API keys (Gemini, Supabase Service Role, Gmail Client Secret) reside strictly in server environment variables (`process.env`). They are never prefixed with `VITE_` and never bundled into frontend assets.
- **Client Tokens:** Only public keys (e.g. Supabase Anon Key) and short-lived user JWTs may be held client-side.
- **OAuth Safety:** Gmail OAuth refresh tokens must never be sent to the browser or stored in `localStorage`. They remain encrypted at rest on the backend.

## 2. Server-Authoritative Permissions
- Client applications request operations; the server enforces permission tiering (`AUTO`, `CONFIRM`, `DENY`).
- Client requests claiming "authorized" status without verified JWT signature are rejected with `401 Unauthorized` or `403 Forbidden`.

## 3. Privacy & Sanitization
- Input sanitization strips dangerous markup from candidate notes and search queries.
- Logger rules: Authentication bearer tokens, raw passwords, candidate social IDs, and email bodies are masked or excluded from application log outputs.
- Sensitive application answers (e.g. legal eligibility) are encrypted at rest.

## 4. Authentication & Password Security (Module 01)
- **Zero Custom Passwords:** Passwords are never stored, hashed, or processed by custom application code. Supabase Auth handles all hashing (bcrypt/Argon2) and verification.
- **Client Token Storage:** Supabase Auth stores user session tokens in client storage using dedicated keys (`career_agent_auth_session`). Passwords and OAuth secrets are never stored in `localStorage`.
- **Anti-Open-Redirect Enforcement:** Redirect query parameters upon login must begin with `/` and never with `//` or external hostnames.
- **Server Identity Derivation:** Backend endpoints (`/api/*`) derive user identity solely by inspecting `Authorization: Bearer <token>` via Supabase server-side validation. User IDs in request bodies or query parameters are never trusted.
