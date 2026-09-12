## 1. Auth backend

No other OpenSpec change is required. This change owns the app entry, routing, and auth setup. Future job changes depend on its user identity and protected layout. Provider credentials are needed for real verification; their absence does not block independent code work.

- [ ] 1.1 Add pinned Convex Auth 0.0.95, Auth.js 0.41.1, a compatible React Router release, and the email dependencies described in `design.md` to `package.json` and the lockfile. Verify installation and package exports against the installed Convex and React versions.
- [ ] 1.2 Extend `convex/schema.ts` with the library's auth tables and add `convex/auth.ts`, `convex/auth.config.ts`, and `convex/http.ts`. Configure Google and Password, preserving the unused numbers table. Verify the generated API exposes the auth functions and that no unsupported auth component import was added.
- [ ] 1.3 Add the verification and reset email providers under `convex/` and declare app-owned configuration in `convex/convex.config.ts`. Use distinct code providers, the configured sender, and explicit delivery errors. Verify the configuration includes both Password flows and server-side validation without logging credentials or codes.
- [ ] 1.4 Add the current-user query in `convex/users.ts`, using the session-derived ID and existing schema validators. Remove the demo exports from `convex/myFunctions.ts`. Verify an unauthenticated profile request is rejected and the three starter functions are no longer callable on the configured development deployment.

## 2. Routes and screens

- [ ] 2.1 Replace the provider in `src/main.tsx` and define public routes plus a protected layout in `src/App.tsx` and `src/components/auth/`. Verify `/app` and unknown paths require login, loading sessions show no protected content, and `/` stays public.
- [ ] 2.2 Build the landing page and protected application shell under `src/pages/`, reusing existing UI components. Replace the starter numbers interface. Verify the public page has login/signup links and `/app` shows the authenticated account email and logout only.
- [ ] 2.3 Build separate login and signup pages with shared form controls and a Google button. Add pending states, validation, accessible labels, password-manager fields, and errors. Verify keyboard submission, links between screens, rejected credentials, and duplicate-submit prevention.
- [ ] 2.4 Build `/verify-email` and `/reset-password` with email/code entry and recovery request steps. Support fresh page loads and the return-to-login path for verification resends. Verify valid completion, resumed unverified signup, invalid and expired codes, duplicate signup, and conditional confirmation for unknown recovery accounts.
- [ ] 2.5 Preserve and validate `returnTo` through password, verification, reset, and Google flows. Verify a local protected destination with query and fragment survives a Google round trip; external, protocol-relative, malformed, and public-auth destinations resolve to `/app`.
- [ ] 2.6 Wire logout and session transitions through the library. Verify reload and browser restart restore a valid session, expired sessions return to login, and logout hides private content across back navigation and tabs sharing the session.

## 3. Provider and hosting setup

- [ ] 3.1 Document local and hosted setup in README, including every environment variable listed in the design, Google callback URLs, open-signup audience settings, Resend sender prerequisites, and the boundary between public and protected routes. Verify the instructions contain placeholders only and identify what the developer must supply.
- [ ] 3.2 Configure the authorized development deployment with the developer-supplied provider values and securely generated signing keys. Verify real Google authentication and delivery of both verification and recovery emails. Record any unavailable credential or sender setup as incomplete; never substitute a mock provider.
- [ ] 3.3 Add the Vercel SPA rewrite to `vercel.json` while retaining the Convex build command. Verify the frontend build and direct loads for every defined page on the configured host, including static assets and the Google return path. Record hosted checks as pending if no authorized host is available.

## 4. Integration verification

- [ ] 4.1 Verify signup and login with a real Google account and a real password account. Exercise both provider orders using the same verified email, confirm one user identity, and verify an unverified email match cannot grant access. Record the results without personal credentials.
- [ ] 4.2 Use two separate accounts to verify the current-user query returns only the caller, direct unauthenticated access fails, and switching accounts clears the previous profile. Document the ownership pattern that later job changes must apply; do not add job operations to demonstrate it.
- [ ] 4.3 Run `npm run check` after implementation and finish with a short browser demo against both specs: public landing, open signup, Google and password login, verification, recovery, protected direct paths, return destinations, reloads, and logout. Record passed scenarios and any provider or hosting blockers in the change. Do not add a new test framework for this change.
