## 1. Shared data and category operations

This change owns the domain schema, shared validators, backend functions, and manual Jobs/Categories UI. It depends on the archived auth foundation already on main. It does not depend on T1's agents or T2's chat/voice work. Coordinate edits to `convex/schema.ts`, `convex/contracts.ts`, and generated bindings with those teammates; their integrations remain separate changes.

- [x] 1.1 Add reusable template, kind, and status validators in `convex/contracts.ts`, then add the four tables and indexes in `convex/schema.ts` as defined in the design. Verify generated types include the agreed fields, accept multiple jobs referencing an input, and preserve existing auth tables.
- [x] 1.2 Add shared session/ownership checks and typed category list/get/create/update operations in `convex/categories.ts`. Verify private listing, valid empty/populated templates, server rejection of invalid or oversized templates, and rejection of another user's category ID.

## 2. Job and checklist operations

- [x] 2.1 Add `convex/jobs.ts` creation from processed text, a single address, and an optional owned category. Save the input and job in one mutation, copying a selected template into item records. Verify one successful categorized submission creates all records with Pending statuses and empty notes, while invalid submissions leave no partial records.
- [x] 2.2 Add owner-indexed job listing and authorized job details with the saved input, nullable category label, and bounded checklist. Verify jobs and categories can be paged without silently dropping records, and foreign or missing IDs expose no private data.
- [x] 2.3 Add manual job status updates and independent item status/notes updates in `convex/checklistItems.ts`. Verify all kinds toggle Pending/Done, job status accepts Pending/In Progress/Done, notes can be cleared, and neither status changes the other automatically.
- [x] 2.4 Deploy the backend additions to the existing configured development deployment and regenerate bindings. Verify Convex accepts the schema and typed functions without changing auth or deployment settings. Coordinate the deployment with teammates using the shared backend.
- [x] 2.5 Make the job category relationship and creation argument optional. Return a nullable category label, create no checklist items when no category is selected, and preserve validation for supplied category IDs. Deploy the additive schema change and regenerate bindings.

## 3. Application navigation and forms

- [x] 3.1 Add missing shadcn sidebar/breadcrumb primitives and an authored `src/components/layout/app-layout.tsx`. Move account and logout controls from `AppPage`, wire the agreed route hierarchy in `src/routes.tsx`, and remove the obsolete page. Verify Jobs/Categories navigation, breadcrumb destinations, protected direct loads, and `/app` redirection preserving query and fragment.
- [x] 3.2 Build the category table, create/edit pages, and shared template form under `src/pages/categories/`. Verify users can save titles and add/edit/remove `{ title, kind }` rows, reload saved categories, and recover from validation or save errors. Keep categories private and omit deletion.
- [x] 3.3 Build the jobs table and manual creation form under `src/pages/jobs/`. Verify address, optional category, and status display; category selection across available pages; uncategorized creation; and successful navigation to the created job. Keep Input out of navigation and omit search.
- [x] 3.4 Build job details with processed text, address, category or Uncategorized label, manual job status, labeled checklist checkboxes, kinds, and editable notes. Verify checkbox and note updates persist after reload, failed writes remain recoverable, and no control starts an agent or external action.
- [x] 3.5 Allow job creation without a category. Show Uncategorized in the dashboard and details, keep manual job status available, and explain that an uncategorized job has no checklist items.

## 4. Integrated verification

- [x] 4.1 Verify two jobs created from one category have independent item records. Edit the category template and create a third job; confirm only the new job receives the new template and earlier progress remains intact.
- [x] 4.2 Exercise signed-out and two-account access for category/job queries and mutations, including direct foreign item IDs. Verify the existing Google login, account controls, return destinations, and authenticated not-found behavior remain intact. Record any real-account blocker rather than replacing auth with a mock.
- [x] 4.3 Update README with the categorized and uncategorized job hand-test flows and deferred integrations. Run `npm run check` and `npm run build`, then demonstrate category creation, both job creation paths, checkbox/notes persistence, and independent manual job status against the acceptance scenarios. Record results and any remaining blocker in this task file.

Verification on 2026-09-13: Convex accepted the schema and functions on `hackathon-dev`. `npm run check` and `npm run build` passed. The authenticated browser created `Verification Electrical 2026-09-13`, two jobs from its two-item template, and a third job after adding a third template item. Job A retained two items, Done item progress, its note, and In progress job status after reload. Job B retained two fresh Pending items. Job C received three fresh Pending items. An uncategorized job saved with zero items, displayed Uncategorized in details and the dashboard, and allowed an independent status change. `/app?view=recent#top` redirected to `/app/jobs?view=recent#top`, and the authenticated catch-all showed the not-found page. The earlier signed-out direct load preserved its return destination. The developer waived the two-account browser check. Server-side ownership checks cover category, job, input, and direct checklist item access. No mock authentication was used.
