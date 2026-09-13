## 1. Google auth scope

This change owns auth and application routing. Future job changes depend on its user identity and protected layout. Password flows and email delivery are removed from scope by the developer's instruction.

- [x] 1.1 Keep only the Google provider in `convex/auth.ts`; remove the email module, Resend dependency, and email environment requirements. Verify installed dependencies and backend exports contain no application password/email provider.
- [x] 1.2 Keep auth tables, issuer configuration, HTTP routes, and the session-derived current-user query. Verify unauthenticated profile access fails and starter demo APIs are no longer callable on dev.

## 2. Screens and route review

- [x] 2.1 Replace login/signup forms with one Google login screen and update landing links. Remove verification and recovery pages. Verify `/` and `/login` work with keyboard navigation and display only the scoped account flow.
- [x] 2.2 Use backend-confirmed auth state in route guards and share return-destination validation. Verify direct protected paths, unknown paths, loading behavior, and rejection of unsafe or public-page return destinations.
- [x] 2.3 Review the account shell and logout flow. Verify retryable failures, account loading, and the signed-in landing link; keep private queries inside the protected layout.

## 3. Configuration and verification

- [x] 3.1 Update README and all OpenSpec artifacts for Google-only auth and five backend variables. Verify there are no remaining email setup requirements and document local/demo callback URLs and per-preview configuration.
- [x] 3.2 Push the revised backend to the configured development deployment and build the frontend. Verify Google handoff, public/protected direct loads, and the existing Vercel SPA configuration. Record hosted checks separately from local checks.
- [ ] 3.3 Complete real Google login, account reuse, reload/browser restart, logout across tabs, and two-account isolation. Record live results or the exact remaining provider/user-input blocker; do not replace Google with a mock.
- [x] 3.4 Run `npm run check` and the frontend build. Record the browser checks, developer-confirmed Google login, and the remaining authenticated checks from task 3.3 below.

## 4. Shared preview deployment

- [x] 4.1 Add a Vercel build wrapper that reuses `hackathon-preview`, registers exact deployment and branch origins independently, and preserves production deployment behavior. Verify the actual Vercel build succeeds with its Preview deploy key.
- [x] 4.2 Allow absolute OAuth return URLs only for the configured origin or registered preview origins. Verify original path/query/fragment preservation and rejection of unrelated origins; keep dev and production restricted to their configured origins.
- [x] 4.3 Provision the persistent shared backend with separate signing keys and development Google credentials. Verify its callback, environment configuration, and frontend backend URL. Record the exact Google redirect URI to add.
- [x] 4.4 Update setup docs, run `npm run check` and the build, commit and push to PR #9, and monitor GitHub CI and Vercel. Verify the deployed preview's public/protected pages and Google handoff; record any external setup still required.

## Verification results

- `npm run check` and `npm run build` passed. The revised backend deployed successfully to dev `brainy-gopher-762`.
- Browser checks passed for the public landing page, the Google-only login screen, direct `/app?view=recent#top` and unknown-path redirects, and Google handoff with the correct callback and identity scopes. The app pages showed no runtime errors after Vite refreshed its dependency cache.
- Direct calls to the current-user query reject unauthenticated access. The three starter demo APIs are unavailable. Shared redirect checks reject external and public-page destinations, including case, encoding, and trailing-slash variants.
- The developer confirmed successful Google login in their own browser. No Google credentials were entered into the agent browser.
- Review fixed premature protected queries by waiting for Convex-confirmed authentication, shared redirect validation across client/server, synchronized OAuth URL cleanup with the router, corrected signed-in landing links, and added retryable logout feedback.
- Auth.js was updated to 0.41.3, a compatible patch release. The dependency audit reports zero vulnerabilities. Application password/email providers and the Resend package are removed.
- Task 3.3 remains open for independent account-reuse, browser-restart, shared-tab logout, and two-account checks. The available user confirmation covers Google login; those additional checks were not independently exercised. No mocked login was used.
- Hosted preview/demo deployment is separate from this branch verification. README lists the matching configuration; this work changed the development deployment only.

### Shared preview results

- The Vercel build for `b3a27d9` succeeded using `hackathon-preview` at `moonlit-roadrunner-502`; GitHub CI also passed. Automatic expiration is disabled on that backend.
- The build registered both its commit origin and `https://site-ahead-git-feat-user-auth-site-ahead.vercel.app`. Callback checks preserved `/app?view=recent#top` on both registered origins and rejected an unrelated Vercel origin and public-page destinations. Unauthenticated profile access was rejected on the shared backend.
- The developer added `https://moonlit-roadrunner-502.convex.site/api/auth/callback/google` to the development Google client. Google accepted the shared OAuth request and served its login page with `openid profile email` scopes.
- Vercel Authentication protects the deployed preview before the app loads. Anonymous requests to `/`, `/login`, and `/app` reach Vercel's login page, so rendered preview UI and a complete Google login were not independently checked. Team members can open the preview while signed into Vercel. Share access through Vercel if demo reviewers need it. This is separate from Google callback configuration and leaves the manual checks in task 3.3 open.
