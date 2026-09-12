## Context

The branch contains an implementation of Google and password authentication on React/Vite with Convex 1.45.0, Convex Auth 0.0.95, Auth.js 0.41.3, and React Router 8.3.1. The user narrowed the hackathon scope to Google login. See [proposal.md](proposal.md).

The local development deployment is `brainy-gopher-762`; the hosted demo at `https://site-ahead.vercel.app` currently connects to `friendly-chipmunk-910`. The current development deployment has Google credentials and signing keys. Hosted configuration and real Google login must be verified separately; local checks do not prove either works.

## Goals / Non-Goals

Keep a small Google login flow, authenticated account access, and a public landing page. Reuse the auth library's users, sessions, refresh tokens, and HTTP routes. Remove password and email flows. Do not add job features, custom credential handling, account management, or production rollout automation.

## Decisions

### Google authentication

Configure only Google in `convex/auth.ts`. Keep `authTables` in `convex/schema.ts`, the issuer in `convex/auth.config.ts`, and `auth.addHttpRoutes` in `convex/http.ts`. Retain pinned dependencies and the existing cryptographic key generation library. Update Auth.js to the compatible 0.41.3 patch, which resolves the advisories reported by the package audit. Remove `resend`, `convex/authEmails.ts`, and the email environment declarations. The auth library owns its internal tables; do not delete account or demo data while removing a provider.

First Google login creates the account. The same Google account returns to the same user. No separate signup screen is needed. Convex Auth is a library with schema and HTTP wiring, not a mounted component. [Setup](https://labs.convex.dev/auth/setup)

### Public and protected routes

| Path | Access | Screen |
| --- | --- | --- |
| `/` | Public | Product introduction, login link, or app link for signed-in users |
| `/login` | Public | Continue with Google and first-login explanation |
| `/app` | Protected | Current account email and logout |
| Other page paths | Protected | Not-found page |

Mount `BrowserRouter` in `src/main.tsx` and `ConvexAuthProvider` in `src/App.tsx`. Supply its `replaceURL` callback through React Router so removing the OAuth code also updates router state. Route guards use `useConvexAuth` from `convex/react` so protected queries wait for backend authentication, rather than just a token in storage. The login button shows progress and handles a failed start. OAuth cancellation returns through the existing guards and allows retry. Logout clears the current browser session through the library, returns to `/`, and allows retry if the operation fails.

Share return-destination validation between browser and backend in `shared/auth.ts`. Accept local paths only, preserve queries and fragments, and reject public paths including their router-equivalent spellings. Parse against the actual frontend origin and fall back to `/app` for invalid input. Keep OAuth callback handling in the library. [Authorization](https://labs.convex.dev/auth/authz)

### Backend account access

`convex/users.ts` derives the current ID using `getAuthUserId(ctx)` and returns only that user's profile with the existing schema validator. Reject unauthenticated callers; never accept a caller-supplied owner ID. Remove the starter function exports and keep their unused table without a data migration. Future job changes must enforce ownership using this user identity.

### Configuration and hosting

Only five backend variables are required: `SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`. `VITE_CONVEX_URL` remains the frontend connection setting. Generate a signing-key pair per deployment; keep credentials out of browser code and logs. Existing unused email secrets do not enable any feature and need no destructive cleanup for this change.

For development, `SITE_URL` is `http://localhost:5173` and the Google callback is `https://brainy-gopher-762.convex.site/api/auth/callback/google`. For the hosted demo, the frontend origin is `https://site-ahead.vercel.app` and the callback is `https://friendly-chipmunk-910.convex.site/api/auth/callback/google`. Configure the matching Google client and Convex environment before a hosted release. Preserve the Vercel build command and SPA rewrite. Each branch preview needs its own matching frontend origin and backend callback. [Google setup](https://labs.convex.dev/auth/config/oauth/google)

## Risks / Trade-offs

- Google credentials and redirect settings can prevent login even when the build passes. Verify the actual round trip and record any provider error.
- A browser without an available Google session needs the developer to complete Google authentication. Never substitute a mock login for that verification.
- Convex Auth is beta. Use installed types and the pinned package; do not infer support from the skill's component-mount instruction.
- The public Vercel deployment is a separate release. Completing this branch does not establish that the hosted demo has received it.

## Verification

Run `npm run check`, build the frontend, and push the backend to the configured development deployment. Check public pages, direct protected navigation, return destinations, Google handoff, and rejected unauthenticated API calls. Verify real Google login, account reuse, logout, session persistence, and isolation when test accounts are available. Keep any unfinished live checks unchecked in `tasks.md`.
