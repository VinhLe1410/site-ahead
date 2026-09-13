## 1. Shared data and category operations

This change owns the domain schema, shared validators, backend functions, and manual Jobs/Categories UI. It depends on the archived auth foundation already on main. It does not depend on T1's agents or T2's chat/voice work. Coordinate edits to `convex/schema.ts`, `convex/contracts.ts`, and generated bindings with those teammates; their integrations remain separate changes.

- [ ] 1.1 Add reusable template, kind, and status validators in `convex/contracts.ts`, then add the four tables and indexes in `convex/schema.ts` as defined in the design. Verify generated types include the agreed fields, accept multiple jobs referencing an input, and preserve existing auth tables.
- [ ] 1.2 Add shared session/ownership checks and typed category list/get/create/update operations in `convex/categories.ts`. Verify private listing, valid empty/populated templates, server rejection of invalid or oversized templates, and rejection of another user's category ID.

## 2. Job and checklist operations

- [ ] 2.1 Add `convex/jobs.ts` creation from processed text, a single address, and an owned category. Save the input, job, and template copies in one mutation. Verify one successful submission creates all records with Pending statuses and empty notes, while invalid submissions leave no partial records.
- [ ] 2.2 Add owner-indexed job listing and authorized job details with the saved input, category label, and bounded checklist. Verify jobs and categories can be paged without silently dropping records, and foreign or missing IDs expose no private data.
- [ ] 2.3 Add manual job status updates and independent item status/notes updates in `convex/checklistItems.ts`. Verify all kinds toggle Pending/Done, job status accepts Pending/In Progress/Done, notes can be cleared, and neither status changes the other automatically.
- [ ] 2.4 Deploy the backend additions to the existing configured development deployment and regenerate bindings. Verify Convex accepts the schema and typed functions without changing auth or deployment settings. Coordinate the deployment with teammates using the shared backend.

## 3. Application navigation and forms

- [ ] 3.1 Add missing shadcn sidebar/breadcrumb primitives and an authored `src/components/layout/app-layout.tsx`. Move account and logout controls from `AppPage`, wire the agreed route hierarchy in `src/routes.tsx`, and remove the obsolete page. Verify Jobs/Categories navigation, breadcrumb destinations, protected direct loads, and `/app` redirection preserving query and fragment.
- [ ] 3.2 Build the category table, create/edit pages, and shared template form under `src/pages/categories/`. Verify users can save titles and add/edit/remove `{ title, kind }` rows, reload saved categories, and recover from validation or save errors. Keep categories private and omit deletion.
- [ ] 3.3 Build the jobs table and manual creation form under `src/pages/jobs/`. Verify address/category/status display, category selection across available pages, the no-category prompt, and successful navigation to the created job. Keep Input out of navigation and omit search.
- [ ] 3.4 Build job details with processed text, address, category, manual job status, labeled checklist checkboxes, kinds, and editable notes. Verify checkbox and note updates persist after reload, failed writes remain recoverable, and no control starts an agent or external action.

## 4. Integrated verification

- [ ] 4.1 Verify two jobs created from one category have independent item records. Edit the category template and create a third job; confirm only the new job receives the new template and earlier progress remains intact.
- [ ] 4.2 Exercise signed-out and two-account access for category/job queries and mutations, including direct foreign item IDs. Verify the existing Google login, account controls, return destinations, and authenticated not-found behavior remain intact. Record any real-account blocker rather than replacing auth with a mock.
- [ ] 4.3 Update README with the manual category-to-job hand-test flow and its deferred integrations. Run `npm run check` and `npm run build`, then demonstrate category creation, job creation, checkbox/notes persistence, and independent manual job status against the acceptance scenarios. Record results and any remaining blocker in this task file.
