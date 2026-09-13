Implementation tasks below record completed code and documentation. Their live acceptance checks are consolidated in [Organization-Rollout.md](../../../docs/Organization-Rollout.md) and remain pending under 5.1 and 5.4. PR #12 CI and Vercel preview deployment passed. No migration, Google flow, or browser demo has run. Final schema tightening and creator-field removal remain pending.

## 1. Schema and membership

- [x] 1.1 Add organization, membership, and invitation validators and indexed tables in `convex/schema.ts`, reusing existing user IDs and validators. Add optional organization IDs and required lookup indexes to domain tables for migration.
- [x] 1.2 Add organization creation, current membership, rename, paginated member listing, and staff removal in `convex/organizations.ts`; add membership and owner helpers in `convex/access.ts`.
- [x] 1.3 Implement a bounded, restartable migration in `convex/migrations.ts` that gives every existing user an organization and owner membership and backfills their private records.

## 2. Invitations

- [x] 2.1 Update the Google profile handling in `convex/auth.ts` to use Google's verified email claim while preserving stable account identity and existing redirect behavior. Handle legacy verification data explicitly.
- [x] 2.2 Add invitation creation, paginated owner listing, copying, revocation, expiry, and renewal under `convex/`, using an ordinary action for secure tokens and internal mutations for writes.
- [x] 2.3 Add matching-recipient invitation lookup, decline, and atomic acceptance.

## 3. Shared jobs and categories

- [x] 3.1 Replace creator checks and indexes in `convex/jobs.ts`, `convex/categories.ts`, and `convex/checklistItems.ts` with current membership and organization checks.
- [x] 3.2 Add atomic job editing for processed text, address, and category.
- [x] 3.3 Add job deletion with checklist cleanup and unused-input cleanup. Add category deletion with an indexed referencing-job check in the same transaction.

## 4. Onboarding and organization screens

- [x] 4.1 Add membership gating beneath `ProtectedLayout` and declare onboarding, invitation acceptance, and owner organization routes in `src/routes.tsx`. Preserve safe return destinations through login and onboarding.
- [x] 4.2 Build `src/pages/organization/create-organization-page.tsx` with a name-only form, matching pending invitations, and account controls.
- [x] 4.3 Build `accept-invitation-page.tsx` with Google account switching and invalid, expired, revoked, already-used, and already-member states.
- [x] 4.4 Build `organization-page.tsx` and private dialogs for renaming, inviting, copying or renewing links, revoking invitations, and confirming staff removal. Follow the design wireframes.
- [x] 4.5 Update `src/components/layout/app-layout.tsx` with organization name, current role, owner-only Organization navigation, and correct breadcrumbs. Handle live removal by unmounting organization pages and showing access removal with onboarding options.
- [x] 4.6 Add job editing and confirmed job/category deletion to the existing feature pages. Update wording for shared categories and category reassignment.

## 5. Migration and verification

- [ ] 5.1 Coordinate the additive deployment, export, backfill, server-side write pause, final validation, and switch to required organization IDs from the migration plan. Remove creator access fields and indexes after validation. Verify every existing user owns an org and all related records remain within the correct org. Coordinate the shared preview backend; this change has no active OpenSpec dependencies but overlaps auth, schema, domain functions, and routing work.
- [x] 5.2 Update affected main spec purpose text and project documentation to describe organization ownership, manual invite delivery, and setup requirements.
- [x] 5.3 Run `npm run check` and verify the implementation pushes cleanly to the intended Convex deployment. Local checks, [PR #12 CI](https://github.com/VinhLe1410/site-ahead/actions/runs/34742649192), and its Vercel preview deployment passed. Live acceptance remains under 5.4.
- [ ] 5.4 Run a short demo with owner, staff, and unrelated Google accounts: migrate existing users including one without data; onboard an account without an org; invite by copied link; share and edit jobs/categories; block used-category deletion; reassign and delete; revoke an invite; remove staff while their job is open; reject further direct reads/writes and old-link reuse. Verify shared data remains, reloads preserve access rules, and no invitation email is sent.
