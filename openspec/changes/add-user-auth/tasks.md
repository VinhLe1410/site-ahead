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

## Verification results

- `npm run check` and `npm run build` passed. The revised backend deployed successfully to dev `brainy-gopher-762`.
- Browser checks passed for the public landing page, the Google-only login screen, direct `/app?view=recent#top` and unknown-path redirects, and Google handoff with the correct callback and identity scopes. The app pages showed no runtime errors after Vite refreshed its dependency cache.
- Direct calls to the current-user query reject unauthenticated access. The three starter demo APIs are unavailable. Shared redirect checks reject external and public-page destinations, including case, encoding, and trailing-slash variants.
- The developer confirmed successful Google login in their own browser. No Google credentials were entered into the agent browser.
- Review fixed premature protected queries by waiting for Convex-confirmed authentication, shared redirect validation across client/server, synchronized OAuth URL cleanup with the router, corrected signed-in landing links, and added retryable logout feedback.
- Auth.js was updated to 0.41.3, a compatible patch release. The dependency audit reports zero vulnerabilities. Application password/email providers and the Resend package are removed.
- Task 3.3 remains open for independent account-reuse, browser-restart, shared-tab logout, and two-account checks. The available user confirmation covers Google login; those additional checks were not independently exercised. No mocked login was used.
- Hosted preview/demo deployment is separate from this branch verification. README lists the matching configuration; this work changed the development deployment only.
