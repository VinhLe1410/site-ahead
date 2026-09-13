# Organization rollout

The implementation is additive and sharing starts paused. Existing records remain schema-valid because `organizationId` and the legacy `ownerId` are optional during rollout. Domain functions use only active membership and organization IDs. They never fall back to creator access.

PR #12 CI and its additive Vercel preview deployment passed. Export, migration, activation, Google sign-in, and the live demo remain operator steps after the target is authorized. The occupied development backend and `localhost:5173` must remain untouched.

## Target and backup

Coordinate the shared `hackathon-preview` backend at `moonlit-roadrunner-502` before publishing a preview build. Every PR preview uses its latest backend code and data. A build deploys schema and functions but never runs the migration or enables sharing. The new app shows “Organization setup in progress” until migration is enabled. Old clients cannot bypass the server gate.

The commands below target that preview explicitly. Run them with a Convex account that has access to it. Do not use a deployment key for another environment; Convex deployment keys can override deployment selection. Confirm the target in the Convex dashboard before proceeding. Use a separate authorized rollout for production.

Export before running the migration. The additive preview deployment does not run migration or remove existing data. Store the export outside the repository. Pick an unused backup filename.

```sh
npx --no-install convex export --deployment-name moonlit-roadrunner-502 --include-file-storage --path /tmp/site-ahead-before-organizations.zip
```

After the approved PR build deploys the additive schema and membership functions, verify the build passed and the preview shows maintenance. Account login remains available. Organization creation, invitations, domain reads, and domain writes remain paused. Do not run `convex dev`, `npm run dev`, or a migration against the development deployment.

## Backfill and validate

Start the migration once. Repeating `start` preserves the cutoff and cursor. The cutoff captures users present when migration starts. Accounts created afterward receive onboarding; accepting invitations never creates an owner organization.

```sh
npx --no-install convex run migrations:start '{}' --deployment-name moonlit-roadrunner-502
npx --no-install convex run migrations:status '{}' --deployment-name moonlit-roadrunner-502
npx --no-install convex run migrations:batch '{}' --deployment-name moonlit-roadrunner-502
```

Repeat the last command until it returns `phase: "validated"`. Each call commits its data changes and cursor in one transaction. Failed calls leave both unchanged. Backfill pages contain at most 50 requested records and use a byte limit. Validation processes one record per call to bound related-record reads. Do not reset the stored cutoff or write the cursor manually.

The migration creates one “My organization” and owner membership for every user at the cutoff, including users without saved data. It then assigns their inputs, categories, and jobs to that organization. It preserves record IDs, input contents, category templates, job status, checklist items, and notes. It normalizes existing email addresses without marking them verified. Missing owners, invalid references, or crossed organization boundaries stop the migration with an error.

Validation checks every cutoff user’s owner membership, one active owner per organization, domain organization references, job input/category references, and every checklist item’s job reference. Each data phase scans the full table, so unused inputs and categories are covered too. Fix any reported data issue under a separate reviewed operator action, then rerun the failed batch. Do not enable sharing around a validation error.

Before enabling, inspect representative records against the backup. Include two unrelated existing creators, an existing account without data, Uncategorized jobs, completed items with notes, and any imported inputs shared by multiple jobs. Repeated `start` and a `batch` after validation must not create extra organizations or alter the cutoff. After enabling, confirm a newly created account without membership reaches onboarding instead of being migrated automatically.

## Enable and finish schema cleanup

Enable only after every batch is validated and the target is approved for the demo:

```sh
npx --no-install convex run migrations:enable '{}' --deployment-name moonlit-roadrunner-502
```

This changes the gate atomically. Connected maintenance screens resume through their membership subscription. An unmigrated or new account sees onboarding, an existing owner sees their migrated work, and only accepted invitations grant staff access.

The final switch to required `organizationId` fields and removal of legacy `ownerId` fields/indexes remains a separate pending rollout task. After validating the migrated deployment, pause sharing, remove the legacy fields from existing domain records in bounded batches, and deploy a reviewed cleanup that requires organization IDs. Update or retire the legacy backfill helpers at the same time, because they still reference `ownerId`. Preserve the rollout gate and membership checks. Do not tighten the schema on a populated deployment before the data is ready.

## Pause or rollback

To pause reads and writes after sharing was enabled:

```sh
npx --no-install convex run migrations:pause '{}' --deployment-name moonlit-roadrunner-502
```

Pausing starts validation again while preserving the cutoff. Repeat `batch` until `validated` and then `enable` to resume. It does not rerun owner creation or backfill, and it does not delete shared data.

Before staff have changed shared data, rollback can restore the export and old application with explicit authorization. After sharing begins, fix forward with writes paused. Restoring the backup after sharing discards later changes and needs explicit acceptance of that loss. Do not restore creator-only authorization over shared work.

## Live acceptance checklist

Use owner, staff, and unrelated Google accounts in separate browser profiles on the approved preview. Keep new invite recipients out of the fixed migration cutoff; migrated existing users already own an organization and cannot join another. Browser checks and direct Convex calls must use the same preview target.

- Confirm returning Google accounts keep their user IDs. Legacy `emailVerificationTime` alone must not allow invitation acceptance. Signing in again uses Google’s actual `email_verified` claim. An unverified profile cannot accept an invitation.
- Confirm a new account sees a name-only organization form and available invitations before creation. Blank names fail. Repeated or concurrent creation/acceptance cannot create another active membership or organization for the user.
- Copy an invitation for a verified Google email. Confirm seven-day expiry, no email delivery, owner-only listing, duplicate rejection, and rejection for existing members. Confirm the owner can copy the same link later, revoke it, and renew an expired invitation with a replacement token. The old token must stop working after renewal. Acceptance must enforce time even if the scheduled expiry has not run.
- Accept with the matching account through both the direct invitation route and normal-login onboarding. Try a wrong account, switch Google accounts, and retry without losing the link. Exercise unknown, expired, revoked, declined, used, and already-member states. Repeated acceptance must not create another membership. Concurrent revoke/accept must have one result; if acceptance wins, remove the member instead.
- Confirm both roles can create, read, edit, and delete shared jobs and categories. Another organization must not list or directly access jobs, inputs, categories, or checklist items. Try blank edits and foreign category IDs; failed edits must leave the job and input unchanged.
- Reassign and clear a category while preserving the job’s checklist titles, kinds, status, and notes. Delete a category while a referencing job exists and confirm the error directs reassignment first. After all references are cleared, delete it successfully. Delete a job and confirm its checklist and unused input are removed while other jobs and templates remain. Editing one job with a shared imported input must leave the other job’s input unchanged.
- Delete an unused category in one browser while another browser has selected it in a draft. Confirm the draft stays visible and requires a new selection or clearing the category.
- Confirm owner/staff sidebar identity, mobile navigation, owner-only Organization navigation, direct owner-route rejection for staff, paginated members/invitations/categories/jobs, empty states, retryable query failures, pending buttons, and keyboard dialog focus.
- Remove staff while their job is open. Confirm the connected UI clears organization content and shows access removal without refresh. Direct reads and writes must fail after removal, including a save racing removal. Shared records must remain for other members. The old accepted link must not restore access; a new invitation may. Reload the removal page, create a separate organization, or accept a new invitation.
- Load protected jobs/categories with query parameters and fragments before login and onboarding. Confirm the destination survives both steps and its access is rechecked. Unknown routes still show authenticated not-found. Existing members visiting organization creation return to Jobs. No organization-data request should mount before the membership gate resolves.
