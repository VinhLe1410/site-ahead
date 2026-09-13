## Context

See [proposal.md](proposal.md) for the outcome. The current schema contains Convex Auth tables and the unused `numbers` table. `convex/users.ts` already derives the authenticated user with `getAuthUserId`. `/app` renders only account details and logout. Google login, protected routes, return-destination helpers, and preview configuration already exist.

Installed versions inspected for this plan are Convex 1.45.0, Convex Auth 0.0.95, and shadcn 4.21.0. Tables, selects, checkboxes, textareas, fields, and buttons are installed; sidebar and breadcrumb primitives are missing. Follow the installed Convex guidelines and skills when implementing, checking installed types for API details.

The discussion deliberately narrows [the roadmap](../../../docs/roadmap.md): categories are private and manually defined, jobs have manual status, every checklist kind uses the same binary completion, and no item agents run. The roadmap's richer request statuses and template keys do not apply to this slice. The existing `app-access` specification's account-only shell is updated by this change's delta.

## Goals / Non-Goals

Keep four small domain tables and ordinary Convex queries/mutations. The backend and frontend can be hand-tested without teammate services. Preserve an input-to-many-jobs relationship without implementing splitting or a second-job creation flow. No agent component, action pipeline, additional backend service, or automatic processing is needed.

## Decisions

### Records and relationships

Use Convex's generated `_id` and `_creationTime`; the discussion's `id` refers to `_id`. Add these fields to `convex/schema.ts`, keeping the auth and existing starter tables intact:

| Table | Authored fields |
| --- | --- |
| `inputs` | `ownerId`, `processedText`, `addressText` |
| `categories` | `ownerId`, `title`, `checklist: Array<{ title, kind }>` |
| `jobs` | `ownerId`, `inputId`, optional `categoryId`, `addressText`, `status` |
| `checklistItems` | `jobId`, `title`, `kind`, `status`, `notes` |

```text
User --< Inputs --< Jobs >-- [Category] >-- User
                     |
                     +--< ChecklistItems

Category.checklist: [{ title, kind }]
                     |
                     +-- copied into new job items
```

`ownerId` references the existing users table and is set from the session. Store it on jobs as well as inputs so the dashboard can query an owner index directly. Checklist ownership is checked through its job. `inputId` is not unique, allowing later creation of multiple jobs for one input. `categoryId` is optional so unclassified jobs can be created and managed before a category is known. Assigning or changing a category after creation remains out of scope.

Preserve the agreed flexible intake field as `inputs.addressText: string | string[]`. A list means candidate matches, not multiple sites. This slice's form and creation operation accept one string and save it to both the input and job. `jobs.addressText` is always one string. Candidate resolution and intake integration remain deferred; the UI does not expose the union or claim that an address was verified.

Store the category checklist as validated JSON objects, not a JSON-encoded string or arbitrary data. Each entry contains only `title` and `kind`. Cap a template at 100 items to bound one creation transaction and its detail query. Allow an empty template for initial setup. Both are implementation defaults for this proposal, not additional workflows.

When a category is selected, copy item titles and kinds when creating the job. Each item starts with `status: "pending"` and `notes: ""`. Editing templates cannot change those copies. Keep `categoryId` for the optional relationship and display its current category title. Display `Uncategorized` when the relationship is absent. Uncategorized jobs start with no checklist items. Checklist contents and progress are the job's saved copy. Separate item records make individual updates simple. Embedding mutable checklist arrays on jobs would require rewriting the array for each checkbox or note change.

No template keys, report fields, agent state, or speculative result payloads are added. Job status values are `pending`, `in_progress`, and `done`; item status values are `pending` and `done`. Kind values are `automated`, `third_party`, and `on_site`. UI labels use the agreed readable names. Kind describes the work; it triggers no behavior in this slice.

### Shared validation and private operations

Define reusable validators in `convex/contracts.ts` for template entries, kinds, and the two status sets. Reuse the template fields in checklist item validation. Derive TypeScript types and full document validators from these definitions and the schema; do not maintain duplicate record interfaces. Trim and reject blank required titles, processed text, and addresses. Validate template length and content on the server, including requests that bypass the forms.

Add `by_ownerId` indexes to inputs, categories, and jobs; `by_inputId` on jobs; and `by_jobId` on checklist items. Use owner-indexed pagination for jobs and categories. Reuse the paginated categories query for category selection, allowing users to load further options. Read the complete bounded job checklist through `by_jobId`. Missing records and ownership failures return explicit errors without returning private contents.

| Area | Client operations |
| --- | --- |
| `convex/categories.ts` | List/get owned categories; create/update title and template |
| `convex/jobs.ts` | List/get owned jobs; create from processed text, one address, and an optional owned category; set job status |
| `convex/checklistItems.ts` | Set item status; save item notes |

Every public operation derives identity server-side using the existing auth approach. Do not accept owner IDs from clients. Job details can return its input, nullable category label, and checklist after checking ownership; Input needs no standalone CRUD API. Share the small ownership checks where needed. Use object-form functions with argument and return validators.

One `jobs.create` mutation accepts a nullable category ID. It validates an ID when supplied, inserts the input and job, copies the selected template items, and returns the job ID. With no category, it saves the job without checklist items. All writes succeed or roll back together. The form disables resubmission while pending. There is no scheduler, LLM, or provider call. This is a manual creation contract; T1/T2 integration must agree any additional calls in a later change.

Status and notes mutations patch only their own fields. Users can select any of the three job statuses and toggle any item regardless of kind or job status. Neither operation derives the other's status. No category/job deletion, job reassignment, or manual addition/removal of items on an existing job is included.

### Routes and screens

Keep Declarative React Router and the complete route hierarchy in `src/routes.tsx`. Nest an authored `AppLayout` beneath `ProtectedLayout`. It owns the shadcn sidebar, breadcrumbs, account query, and logout controls moved from `AppPage`.

| URL | Screen |
| --- | --- |
| `/app` | Redirect to `/app/jobs`, retaining query and fragment |
| `/app/jobs` | `JobsPage`: shadcn table of address, category, status, and an open action |
| `/app/jobs/new` | `NewJobPage`: processed text, address, optional category selection |
| `/app/jobs/:jobId` | `JobPage`: input text, address, category, manual status select, checklist checkboxes and notes |
| `/app/categories` | `CategoriesPage`: private category table and create/open actions |
| `/app/categories/new` | `NewCategoryPage`: title and editable template rows |
| `/app/categories/:categoryId` | `CategoryPage`: edit title and template rows |

Use relative child paths and an index redirect under `/app`. Keep the authenticated catch-all and the public `/` and `/login` behavior. Remove the obsolete account-only page after moving its controls. Do not create a job layout for a single job screen or introduce report routes.

Place job pages in `src/pages/jobs/`, category pages in `src/pages/categories/`, the shared category form in `src/pages/categories/components/category-form.tsx`, and the app layout in `src/components/layout/app-layout.tsx`. Keep small page-private UI in its page until it needs extraction. Use descriptive kebab-case filenames and named exports.

Add missing shadcn sidebar and breadcrumb primitives using the installed project style; reuse existing table, select, checkbox, field, input, textarea, button, and feedback controls. Keep authored wrappers outside `src/components/ui/`. Category forms edit template rows using a title input and kind select with add/remove controls. They serialize to the agreed JSON shape; users do not need a raw JSON editor.

Use Convex subscriptions for saved data and local state for unsaved fields. Save notes explicitly per item; checkbox changes save completion independently. Keep fields usable after failures and expose retry or resubmission. Label controls and retain existing retryable logout behavior. No search bar or Input navigation entry is added.

## Risks / Trade-offs

- Users can mark jobs Done while items remain Pending. This is the agreed manual behavior; display both saved states without imposing a dependency.
- Template copies will not follow later edits. This preserves job progress; no versioning or migration UI is needed.
- Category titles are displayed from the related category, while item definitions are copied. Renaming a category does not rewrite any job item. Jobs without that relationship display as Uncategorized.
- The manual form does not interpret trades or validate addresses geographically. Its entered values let the team exercise persistence while intake work continues separately.
- Preview deployments share a backend. Coordinate schema deployment with teammates and keep changes additive.

## Migration Plan

Add the four tables and indexes, deploy to the existing configured development backend, and regenerate Convex bindings. Make `jobs.categoryId` optional so existing categorized jobs remain valid and new jobs may omit it. Do not alter auth tables, provider settings, preview origins, or existing deployment selection. No backfill is needed. Categories are created through the UI; this change does not seed another owner's records or install seed tooling.

Verify the typed backend before connecting the pages. Deploy the frontend through the existing process. If the UI needs rollback, restore the previous frontend and leave the additive tables and their data intact. Do not delete stored user data as part of rollback.
