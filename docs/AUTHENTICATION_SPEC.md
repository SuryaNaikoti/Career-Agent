# Authentication & Identity Specification (Module 01)

## 1. Overview & Identity Boundary
Module 01 introduces real user authentication and establishes the canonical identity/session boundary for Career Agent using **Supabase Auth**.

### Core Principle
- **Canonical Identity:** The Supabase user UUID (`user.id` matching `auth.users.id`) is the canonical primary identifier. Future candidate profile records, applications, and documents will bind to this UUID via foreign keys.
- **Scope Restriction:** Module 01 establishes *who the user is* and maintains their active session. It does NOT prematurely construct the full candidate resume/experience database (deferred to Module 04) or AI features (deferred to Module 10).

---

## 2. Authentication Methods
1. **Email + Password:**
   - Password strength validation (at least 6 characters).
   - Email format verification.
   - Email confirmation support (detects unconfirmed state and shows confirmation prompt).
2. **Google OAuth:**
   - Client-side redirect via official `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
   - Requires Google OAuth to be enabled in the user's Supabase dashboard. If unconfigured, displays clear diagnostic feedback without pretending authentication succeeded.

---

## 3. Session Lifecycle & State Model
The application avoids flashes of unauthenticated content by distinguishing four distinct states:

| State | Definition | UI Handling |
| :--- | :--- | :--- |
| `INITIALIZING` | Supabase client is restoring session from local storage or URL tokens. | Displays `AuthLoadingState` ("Checking your session..."). Prevents unauthorized screen flashes. |
| `AUTHENTICATED` | Valid session and verified `AuthUser` active. | Grants access to `/app/*` and `/onboarding`. |
| `UNAUTHENTICATED` | No active session exists. | Redirects requests from protected routes to `/auth?redirect=<target>`. |
| `AUTHENTICATION_ERROR` | An error occurred during auth transaction. | Displays human-friendly error banner via `AuthError`. |

### Event Subscription
`authService.onAuthStateChange` reacts to standard Supabase events:
- `SIGNED_IN`: Updates user and session state.
- `SIGNED_OUT`: Purges user state and redirects to `/auth`.
- `TOKEN_REFRESHED`: Seamlessly updates authorization headers and session.
- `USER_UPDATED`: Reflects password or metadata changes.

---

## 4. Protected Routes & Navigation Flows

### Route Classifications
- **Public Routes:**
  - `/` (Splash screen — resolves session and directs user)
  - `/install` (PWA installation guide)
  - `/auth` (Sign In / Create Account / Forgot Password)
  - `/auth/reset-password` (Password recovery entry point)
- **Protected Routes:**
  - `/onboarding` (Career intake — requires valid session)
  - `/app/*` (`/app/home`, `/app/jobs`, `/app/applications`, `/app/agent`, `/app/profile`, `/app/resume`, `/app/preferences`)

### Redirect Security (Anti-Open-Redirect)
When an unauthenticated user navigates to `/app/jobs`, they are redirected to `/auth?redirect=%2Fapp%2Fjobs`.
Before navigating post-authentication, the redirect target is strictly validated:
```ts
// Must start with '/' and must NOT start with '//' (prevents protocol-relative external redirects)
if (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
  return rawRedirect;
}
return '/app/home';
```

---

## 5. Server-Side Authorization (`/api/*`)
The Express server runtime derives identity authoritatively from the incoming Bearer token. It **never** trusts client-supplied user IDs or email addresses in request bodies.

### Authenticated Identity Endpoint
- **Route:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <access_token>`
- **Response (Unauthenticated):** `401 Unauthorized`
  ```json
  { "authenticated": false, "error": "Unauthorized: No valid session token provided" }
  ```
- **Response (Authenticated):** `200 OK`
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "11111111-2222-3333-4444-555555555555",
      "email": "candidate@example.com",
      "emailConfirmed": true
    }
  }
  ```

---

## 6. Supabase Dashboard Configuration Checklist

To activate full production authentication, the developer must perform the following in the Supabase Dashboard:

1. **Obtain Project Credentials:**
   - In Supabase Dashboard -> **Project Settings** -> **API**:
   - Copy **Project URL** into `VITE_SUPABASE_URL`.
   - Copy **anon public key** into `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. **Configure Auth URL Settings:**
   - In **Authentication** -> **URL Configuration**:
   - **Site URL:** Set to `https://your-domain.run.app` (or `http://localhost:3000` during local development).
   - **Redirect URLs:** Add:
     - `http://localhost:3000/**`
     - `https://your-domain.run.app/**`
     - `https://your-domain.run.app/auth/reset-password`
3. **Configure Email Authentication:**
   - In **Authentication** -> **Providers** -> **Email**:
   - Enable Email Signup.
   - Enable "Confirm email" if verification links are desired.
4. **Configure Google OAuth (Optional):**
   - In **Authentication** -> **Providers** -> **Google**:
   - Obtain OAuth Client ID & Client Secret from Google Cloud Console.
   - Paste Client ID and Client Secret into Supabase Google provider settings.
   - Add Supabase Callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to Authorized Redirect URIs in Google Cloud Console.
