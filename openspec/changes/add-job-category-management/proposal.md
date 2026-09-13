## Why

The app currently stops at an authenticated account screen. The backend owner needs persisted jobs, private category templates, and a small UI to exercise them while teammates build intake and agents.

## What Changes

- Add Input, Category, Job, and ChecklistItem records. An input can relate to many jobs; this slice creates one job with one address per submission.
- Let users create and edit private trade categories. Each category stores a checklist JSON array of `{ title, kind }` templates.
- Create an input behind a manual job creation form containing processed text, one address, and a selected category. Copy that category's templates into independent job checklist items.
- Let users browse and open their jobs. Job statuses are Pending, In Progress, and Done, changed manually. Checklist items are Pending or Done, toggled by checkboxes, with editable notes.
- Keep existing job checklist items unchanged when a category template is edited. Omit template keys.
- Add a shadcn sidebar with Jobs and Categories, breadcrumb navigation, tables, and creation/editing forms. Keep Input out of navigation and omit search.

Exclude agent execution, findings, request drafts, reports, natural-language extraction, chat, voice, coordinates, address disambiguation, automatic job splitting, automatic status changes, deletion, and shared categories. These user decisions narrow the broader [roadmap](../../../docs/roadmap.md); the category form supports manual setup without waiting for either teammate.

## Capabilities

### New Capabilities

- `category-management`: Private trade categories with editable checklist templates and validation.
- `job-management`: Job creation with saved input, a private dashboard, independent checklist items, notes, and manual status updates.

### Modified Capabilities

- `app-access`: Replace the account-only shell with protected Jobs and Categories navigation while preserving Google auth, account controls, and return destinations.

## Impact

Extend the existing Convex schema and typed functions. Add authored layouts, job/category pages, and shared validators. Reuse React Router, Convex Auth, and installed shadcn controls; add the missing sidebar and breadcrumb primitives. Preserve existing auth tables and deployment configuration. No new agent or external-service dependency is needed.
