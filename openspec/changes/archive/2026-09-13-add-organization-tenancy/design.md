## Context

See [proposal.md](proposal.md) for the outcome. Before this change, inputs, categories, and jobs belonged to their creator. This change implements organization ownership and shared CRUD. The existing template limit is 100 items.

`src/components/layout/app-layout.tsx` owns the sidebar, account controls, and breadcrumbs. `ProtectedLayout` checks Google authentication. `shared/auth.ts` preserves protected destinations, including query and fragment. The installed packages inspected are Convex 1.45.0 and Convex Auth 0.0.95. No new dependencies are needed. Product and architecture documents describe future agent work; this change does not implement it.

Existing specs explicitly isolate work by creator. The delta specs replace that rule with organization isolation. Google account creation and private profile access remain unchanged. Onboarding gates organization work after account creation.

## Goals / Non-Goals

Keep authorization in Convex and express the same membership state in the UI. Use the existing declarative router, sidebar, forms, tables, dialogs, and return-destination helpers. Avoid a permission framework, external organization service, or additional auth provider. Do not implement email delivery, role editing, or organization switching.

## Decisions

### Organization and membership records

Add `organizations` with a name and `memberships` with user ID, organization ID, role (`owner` or `staff`), and state (`active` or `removed`). Index memberships by user ID and by organization ID plus state. Each user has at most one membership record; creating or joining after removal replaces that record. This records the access-removed state across reloads without building membership history.

Organization creation inserts the organization and owner membership in one mutation after checking the caller has no active membership. Invitation acceptance creates only staff membership. No operation promotes staff or removes an owner, so exactly one owner is preserved without duplicating the owner role on the organization. A user with an active membership cannot create or join another organization. Concurrent creation and acceptance read the same membership index range and cannot both succeed.

Require organization IDs and organization indexes on inputs, jobs, and categories. Retain checklist ownership through the job instead of repeating it on every item. Add a jobs index on category ID for deletion checks; retain the input ID index for input cleanup. Remove creator fields and indexes. No new audit history is needed.

### Live membership checks

Replace creator checks in `convex/access.ts` with helpers for authenticated membership, owner privileges, and resource organization matching. Public functions derive the user from Convex Auth. Resource IDs never establish authorization. Every job, category, input, and checklist operation reads active membership before accessing organization data. Related category and input records must match the job's organization.

The app subscribes to a small current-membership query. That query returns onboarding, active membership, or access-removed state without throwing for expected removal. Put a membership layout under `ProtectedLayout`, before `AppLayout`, so organization queries do not mount before membership resolves. Owner-only navigation is supplemented by backend checks.

Removal changes the membership state in one mutation after verifying the caller is that organization's owner and the target is staff. An edit mutation reads membership in the same transaction as its writes. A concurrent removal invalidates that read, so an edit can commit before removal or fail after retry, but cannot commit on stale membership afterward. This uses [Convex transaction behavior](https://docs.convex.dev/database/advanced/occ).

Connected clients receive the membership update through [Convex reactive queries](https://docs.convex.dev/realtime). The membership layout unmounts organization pages and shows the removal message. Handle expected access loss in resource queries without leaving an error boundary over stale content. This does not invalidate the Google session. Offline pages can retain data already delivered until reconnecting; no fixed millisecond UI guarantee is promised.

### Manual invitations

Add invitations containing organization ID, normalized recipient email, a random token, status, expiry, and accepted user ID when accepted. Index by token, organization ID plus status, and recipient email plus status. Use trim and lowercase consistently; do not strip Gmail dots or plus suffixes, and do not infer membership from domains.

Generate a cryptographically random token in an ordinary action, then call an internal mutation that checks the current owner and inserts or renews the invitation transactionally. Store the token so the owner can copy the same link later. Expose it only to the owner and the matching invited user. Do not log tokens. Build links using the current frontend origin and the protected `/invite/:token` route.

Proposed demo default: invitations expire after seven days. Creation or renewal schedules an internal expiry mutation guarded by the current expiry and token, so an old scheduled call cannot expire a renewed invitation. Acceptance always checks the current time in its mutation even if scheduled expiry has not run. Queries use the stored status; they do not rely on a wall clock to become reactive. Renewal replaces the token, and revocation invalidates it. Owner lists paginate rather than reading unlimited rows.

Invitation acceptance checks token, pending status, expiry, matching verified email, and absence of active membership in one mutation. Successful acceptance marks the invite accepted and inserts or replaces the staff membership. A repeated acceptance by the same active member opens the org; an accepted link cannot restore removed access. Revocation racing acceptance follows transaction order. If acceptance wins first, the owner removes the member rather than revoking an already accepted invite.

Use server-stored Google profile data for recipient matching. Convex Auth 0.0.95 defaults OAuth email verification when an explicit flag is absent, so do not assume its default mapping proves Google's `email_verified` claim. Configure the Google profile mapping to pass the actual claim as `emailVerified`, preserving the stable Google account ID and existing name, image, and email fields. Persist the actual claim separately as optional `users.googleEmailVerified`, along with a normalized email index. Invitation matching requires this flag to be true. A false claim or missing verification cannot grant invitation access. Keep existing redirect callbacks and auth configuration intact. The installed Convex auth and docs skills inform this integration; no new keys or provider setup is needed.

On normal login without membership, query pending invitations for the authenticated verified email and offer acceptance or decline before organization creation. With several invitations, show the org names and let the user choose; joining one does not grant other memberships. Declining an invitation changes only that recipient's invitation. Wrong-account pages offer Google account switching while preserving the invite route. Unknown or mismatched links expose no private org management data.

### Routes and screens

Keep all route declarations in `src/routes.tsx`:

| Route | Access | Screen |
| --- | --- | --- |
| `/app/organization/new` | Authenticated, no active membership | Create organization or choose a pending invitation |
| `/invite/:token` | Authenticated | Accept invitation or explain why it cannot be accepted |
| `/app/organization` | Active owner | Organization name, members, and invitations |
| Existing jobs and categories routes | Active member | Shared organization work |

Place onboarding and acceptance outside the membership layout but under `ProtectedLayout`. An active member visiting organization creation returns to Jobs. Put membership gating around known organization routes only; unknown routes keep the existing authenticated not-found behavior. Preserve the original return destination through onboarding, and recheck access when opening it. Invitation acceptance without another valid destination opens Jobs.

Use `src/pages/organization/create-organization-page.tsx`, `organization-page.tsx`, and `accept-invitation-page.tsx`, with private dialogs in that feature's `components/` folder. Add a membership layout in `src/components/auth/`. Update breadcrumb labels for Organization and onboarding instead of treating every non-category path as Jobs.

Create organization, without the sidebar:

```text
+------------------------------------------------------+
| Site Ahead                                           |
|                                                      |
|              Create your organization                |
|              Organization name                       |
|              [ Ironbark Site Services        ]        |
|                                                      |
|              [ Create organization ]                 |
|              alex@gmail.com        [ Log out ]        |
+------------------------------------------------------+
```

Owner sidebar and Organization screen:

```text
+------------------------+---------------------------------------------+
| Site Ahead             | Organization                                |
| Ironbark Site Services  +---------------------------------------------+
|                        | Ironbark Site Services        [ Edit name ] |
|   Jobs                 |                                             |
|   Categories           | Members                    [ Invite staff ] |
| > Organization         | Alex / alex@gmail.com   Owner / You         |
|                        | Sam / sam@gmail.com     Staff    [ Remove ] |
|                        |                                             |
|                        | Pending invitations                         |
|                        | jo@gmail.com / Expires in 6 days            |
|                        |                     [ Copy link ] [ Revoke ]|
|                        | pat@gmail.com / Expired                     |
|                        |                     [ Renew ]     [ Revoke ]|
|                        |                                             |
| Alex Nguyen            |                                             |
| alex@gmail.com         |                                             |
| Owner                  |                                             |
| [ Log out ]            |                                             |
+------------------------+---------------------------------------------+
```

Staff keep Jobs and Categories, the organization name, and their own email and Staff role. Organization navigation is owner-only. Use one organization name, not a switcher. Keep desktop sidebar behavior and its existing mobile toggle. Tables become stacked rows where needed on narrow screens.

Invite dialog and successful creation:

```text
+-----------------------------------------------+
| Invite staff                              [x] |
| Google account email                          |
| [ jo@gmail.com                              ] |
| Staff can create, edit, and delete this       |
| organization's jobs and categories.           |
|                    [ Cancel ] [ Create invite ]|
+-----------------------------------------------+

+-----------------------------------------------+
| Invitation ready                          [x] |
| Share this link with jo@gmail.com.            |
| [ https://.../invite/...            ] [ Copy ] |
| Expires in 7 days. No email has been sent.     |
|                                      [ Done ] |
+-----------------------------------------------+
```

Invitation acceptance, after Google login:

```text
+------------------------------------------------------+
| Site Ahead                                           |
|                                                      |
|              Join Ironbark Site Services              |
|              You've been invited as staff.           |
|              Manage shared jobs and categories.      |
|                                                      |
|              Signed in as jo@gmail.com               |
|              [ Join organization ]                   |
|              [ Use a different account ]             |
+------------------------------------------------------+
```

Show useful empty, loading, and failure states. Disable duplicate submissions while pending. Keep dialogs keyboard-accessible and restore focus on close. Removal confirmation names the member and explains that access ends immediately while shared data stays. The access-removed screen offers organization creation, available invitations, and logout without exposing the former org's data.

### Complete shared CRUD

Add an edit form to the existing job details screen for processed text, address, and category, reusing existing inputs and validators. Keep status and checklist controls. Category reassignment, including clearing it, does not rebuild or reset the checklist; explain that in the form. Update the job and its saved input atomically. Existing creation saves one input for one job; if an input has shared references, editing must create a separate input for the edited job rather than change another job's intake.

Add confirmed job deletion. Delete the job's bounded checklist and remove its input only if no other job references it. Keep category templates unchanged. Add confirmed category deletion, with an indexed one-record existence check for referencing jobs in the same transaction as deletion. A concurrent job creation or reassignment cannot leave a dangling category reference. The agreed rule blocks deletion until all references are reassigned or cleared.

## Development reset

After PR #12 merged, the developer chose a clean slate instead of preserving development data. Reset the three personal development deployments and the shared `hackathon-preview` deployment. Leave production and the seven old PR preview deployments unchanged. Keep deployment URLs and auth settings.

Delete all application and auth records, then deploy the required organization schema. Remove the migration functions, rollout table, server gates, and maintenance screen. An empty database must allow a new account to reach onboarding immediately. Login does not create an organization; explicit creation makes the account its owner, and invitation acceptance creates staff membership only.

See [organization setup and verification](../../../../docs/Organization-Rollout.md) for the deployment inventory and verification record. Production and old previews still have their previous code and data; any future reset or deployment to those targets requires separate authorization.

## Risks / Trade-offs

- Previously loaded data remains in an offline browser. Membership checks prevent fresh access and writes; the connected UI clears on the next subscription update.
- One organization per user means an existing owner cannot join another org. Ownership transfer and org switching remain outside this demo.
- Category reassignment preserves potentially different checklist contents. Explain that preservation beside the selector instead of silently regenerating progress.
- Auth email verification must reflect Google's claim. Inspect the installed provider mapping and manually verify the real login flow before enabling invitations.
- A shared preview backend can expose old frontends to a new schema. Coordinate backend deployments because all previews share its code and data.
