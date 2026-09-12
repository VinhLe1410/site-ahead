## Why

Site Ahead currently exposes a starter screen and unauthenticated demo functions. Contractors need their own accounts before we add private job workflows.

## What Changes

- Add open signup and login through Google or email/password, with logout and persistent sessions.
- Add password email verification and password reset so users can prove ownership and recover access.
- Add a public landing page at `/` with login and signup links. Keep authentication and recovery screens public.
- Protect every other application path. Send signed-out visitors to login and return them to their requested page after authentication.
- Replace the starter screen with a minimal protected `/app` shell showing the current account and logout. Remove the starter API exports so they do not remain publicly callable; retain the unused demo table without deleting data.
- Enforce authentication in backend functions and expose only the current user's profile. Later job work must use this identity for ownership checks.

Assumptions: the public page briefly explains Site Ahead for contractors. `/app` is an entry shell, with no job creation, checklist, or report implementation. This request makes auth the first feature and adds live Google and account-email integrations to the earlier demo scope. Invitations, admin roles, organizations, passkeys, and account management screens are excluded.

## Capabilities

### New Capabilities

- `user-auth`: Open signup, login, email verification, password recovery, sessions, and access to the current account.
- `app-access`: Public landing and authentication pages, protected application routes, and navigation between them.

### Modified Capabilities

None. The project has no existing specs.

## Impact

Implementation affects `src/main.tsx`, `src/App.tsx`, new page and auth components, `convex/schema.ts`, auth configuration and HTTP routes, a current-user query, and the starter functions in `convex/myFunctions.ts`. It adds Convex Auth, its compatible Auth.js dependency, a browser router, and account-email delivery. Existing UI components are reused. `vercel.json` needs support for direct page loads; README setup must cover Google credentials, email delivery, and deployment configuration.

The official `convex-auth` skill is installed in `.agents/skills/`, linked into `.claude/skills/`, and recorded in `skills-lock.json`. This change prepares implementation; it does not configure external accounts or deploy the app.
