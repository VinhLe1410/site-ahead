## Context

See [proposal.md](proposal.md) for scope and motivation. There are no existing specs or active changes. `src/App.tsx` renders the Convex numbers demo. `src/main.tsx` uses plain `ConvexProvider`; no auth or router dependency exists. `convex/schema.ts` defines only `numbers`, and all three exports in `convex/myFunctions.ts` are public. `vercel.json` has the Convex build command but no SPA rewrite. Existing `button`, `input`, `field`, `card`, `alert`, and `skeleton` components cover the UI needs. No application test suite is installed.

The installed Convex version is 1.45.0. Package metadata checked on 2026-09-13 lists `@convex-dev/auth` 0.0.95 with peers compatible with this project's Convex and React versions, and `@auth/core` ^0.41.1. Pin auth to 0.0.95 and Auth.js to 0.41.1 for implementation. Validate installed exports and types before wiring them. [Convex Auth setup](https://labs.convex.dev/auth/setup)

The product notes prioritize jobs and exclude most live integrations; this conversation explicitly puts authentication first and accepts Google plus password accounts. Google authentication and account emails are live integrations in this change. The architecture's homeowner, Gmail, agent, and workflow concepts do not add requirements here. The landing copy remains contractor-focused.

## Goals / Non-Goals

Use Convex Auth's identity and session model throughout the existing React SPA. Keep browser access rules separate from backend authorization. Reuse existing UI primitives and generated types. Do not add an application server, custom credential store, generic permissions framework, or job schema. Future job work depends on this change and must enforce ownership using the authenticated user ID.

## Decisions

### 1. Use Convex Auth with Google and Password

Add `convex/auth.ts` with Google's Auth.js provider and Convex Auth's Password provider, `convex/auth.config.ts` with the deployment issuer, and `convex/http.ts` using the library's HTTP routes. Extend `convex/schema.ts` with `authTables`. Replace the root client provider with `ConvexAuthProvider`. Keep the library's session persistence, refresh, credential hashing, verification expiry, and attempt limits. [Manual setup](https://labs.convex.dev/auth/setup/manual)

The installed [convex-auth skill](../../../.agents/skills/convex-auth/SKILL.md) says to mount auth in `convex.config.ts`. Version 0.0.95 has no component export, and the official setup uses auth tables and HTTP routes. Follow that verified package interface; do not invent a component import. A `convex/convex.config.ts` may declare app-owned typed environment variables as required by the generated guidelines, without mounting auth. Use manual key generation with cryptographic randomness and `jose`; avoid the interactive setup wizard and never print private keys into logs. Existing TypeScript configuration already uses Bundler resolution and skipLibCheck.

Hosted auth and Better Auth are alternatives, but the user selected Convex Auth and its direct Convex integration fits this SPA. This design keeps that choice.

### 2. Verify password emails and support recovery

Use the Password provider's `verify` and `reset` flows with emailed codes. Resend is the proposed delivery service because the official password guide provides this integration. Use one small email module for the two messages, distinct provider IDs for their codes, and the documented token generation helpers. Pin any email dependencies at implementation. Supply the sender through an app-owned `AUTH_EMAIL_FROM` deployment variable. Do not add a queue, email inbox, or template framework. [Password configuration](https://labs.convex.dev/auth/config/passwords)

Keep passwords at the documented minimum of eight characters, with consistent browser and server validation. Signup requests a verification code; login for an unverified account resumes verification. `/verify-email` accepts email and code, including after reload. Resending verification returns through password login so the library can authenticate the account before sending another code. `/reset-password` contains request and code-entry steps. It also offers code entry on a fresh page load. Valid completion uses the library's session result before navigating.

Use the library's linking of accounts with verified email ownership. Verify both provider orders against the pinned package. Do not write custom email-based merging or trust an unverified email match. [Account linking](https://labs.convex.dev/auth/advanced#account-linking)

Catch form and provider errors to show useful feedback. Map wrong-password and unknown-account login failures to one message. Recovery requests show conditional confirmation for unknown accounts; delivery failures remain errors. Never persist passwords or codes in URLs, browser storage, or application logs. Email/code inputs after reload avoid a custom persisted recovery state.

### 3. Add one browser router and a protected layout

Use React Router in declarative mode with `BrowserRouter`, nested routes, and one protected layout. Pin a release compatible with the installed React version; current metadata lists 8.3.1 as compatible with the declared React 19.2.8 dependency. This handles direct paths and browser history without custom pathname listeners. Hash routing would change the requested URL shape; a full framework migration is unnecessary. [React Router routing](https://reactrouter.com/start/declarative/routing)

| Path | Access | Screen |
| --- | --- | --- |
| `/` | Public | Short Site Ahead introduction and account entry links |
| `/login` | Public | Email/password login, Google, signup and recovery links |
| `/signup` | Public | Email/password registration, Google, login link |
| `/verify-email` | Public | Email and verification code |
| `/reset-password` | Public | Request a code or submit email, code, and new password |
| `/app` | Protected | Account email and logout |
| All other page paths | Protected | Not-found page until a feature adds a route |

Keep public routes explicit in `src/App.tsx`; place `/app` and the catch-all beneath the protected layout. Future application routes belong there. Use Convex's authentication loading state to withhold both protected children and their queries until the session is resolved. Signed-in visitors to auth screens redirect to their destination. The public landing page stays available to everyone.

Carry `returnTo` through the auth pages. Normalize it with the URL parser and accept only same-origin protected destinations; reject public routes, external origins, protocol-relative input, and malformed values. Preserve path, query, and fragment. Pass the validated local destination as the library's OAuth redirect target so it survives Google's full-page round trip. Check that backend redirect validation also restricts the site origin. Never interfere with the library's OAuth callback parameters. Use `/app` when no valid destination exists.

Logout awaits the library action, then navigates to `/`. Invalid or expired sessions unmount protected content. The library owns shared-tab session storage and cache transitions; verify that user A's profile does not remain after user B signs in. [Convex Auth authorization](https://labs.convex.dev/auth/authz)

### 4. Enforce access in Convex

Add a `convex/users.ts` current-user query with object-form arguments and return validators. Derive its ID with `getAuthUserId(ctx)` and fetch that user only. Return the profile using existing schema validators and generated types. An unauthenticated caller receives an authorization error, and a missing user for an authenticated session is an explicit error. Never accept a user ID for this lookup. The provider resolves session state independently, so public pages do not need this query.

Remove the starter exports from `convex/myFunctions.ts` when replacing their UI. Retain the existing `numbers` table and its data, without any callable demo API or migration. Keeping the endpoints public would leave an unnecessary entry point; converting the demo into a private numbers feature would add unrelated work.

No jobs exist yet. This change demonstrates isolation with the current-user query and two accounts. When jobs are introduced, their changes must store an owner using `Id<"users">`, derive ownership from the session, and check access in every relevant function. This plan does not claim to implement or verify nonexistent job operations.

### 5. Configure real providers and hosted paths

Backend configuration needs `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, and `AUTH_EMAIL_FROM`. Only the existing `VITE_CONVEX_URL` belongs in the browser environment. Auth library variables remain available in the form the installed library expects; app-owned variables use the generated typed environment interface.

Google's callback is `<Convex HTTP Actions URL>/api/auth/callback/google`, on the `.convex.site` origin. Configure the actual local and hosted frontend origins. The developer supplies the Google project/client credentials and configures an external audience suitable for open signup; a test-user-only Google configuration is insufficient for the public launch. Resend needs credentials and a sender permitted to deliver to signup users. These are setup prerequisites, not mocked integrations. [Google configuration](https://labs.convex.dev/auth/config/oauth/google)

Extend `vercel.json` with the documented SPA rewrite while retaining the existing Convex build command. Static assets must keep working, and auth callbacks stay on Convex's HTTP origin. Document direct-load checks and environment-specific origins in README. Use a stable frontend origin for auth validation; arbitrary preview domains need their own matching configuration. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas)

## Risks / Trade-offs

- Convex Auth is beta. Pin its version and verify the actual package interfaces and both login methods before declaring implementation complete.
- Provider credentials and sender setup can block real Google or email verification. Finish independent implementation work and record the specific missing setup; never replace a required provider with a fake success.
- Client routing does not protect data by itself. Keep all application data behind backend checks and verify direct unauthenticated calls.
- Account linking affects identity. Exercise both provider orders with the same verified email and confirm that an unverified signup cannot access an existing account.
- Public signup depends on Google audience and email delivery configuration. Development-only provider restrictions must be recorded until the public configuration is ready.

## Migration Plan

1. Implement auth schema, backend checks, routes, and screens together. Auth tables are additive; preserve demo data.
2. Configure an authorized development deployment and provider credentials. Keep secrets out of tracked files and command output.
3. Run existing checks and a real browser demo, including reloads, recovery, logout, direct API denial, and two-account isolation. Validate hosted deep links when a configured host is available.
4. Before any later production release, configure that deployment's issuer, keys, sender, and frontend origin. Production publication is separate from this planning request.
5. If a release fails, keep the site in a closed maintenance state while fixing auth. Do not restore the unauthenticated starter APIs or delete auth tables as a rollback.

## Setup Values Needed During Implementation

The developer must supply the Google client credentials, Resend credentials and approved sender, and the frontend origin used for hosted validation. These values do not change the behavior or task breakdown and are not needed to review this plan.
