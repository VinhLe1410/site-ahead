## Context

See [proposal.md](proposal.md) for the agreed scope. The current [schema](../../../convex/schema.ts) gives organizations shared categories and jobs. `categories.checklist` stores a bounded array of template entries containing only title and kind. `jobs.create` copies those entries into independent checklist records in one mutation. `jobs.update` preserves the checklist when a category changes. The [synced specs](../../specs/) describe this manual flow.

`convex/access.ts` already checks active membership and resource organization. `convex/http.ts` currently registers only authentication routes. `src/routes.tsx` places organization work beneath the authentication and membership layouts. `CategoryForm` currently strips each submitted entry down to title and kind, so it must preserve the added document references. The frontend template type also duplicates the backend shape and should be derived from the existing contracts when extended.

Installed versions inspected: Convex 1.45.0 and Convex Auth 0.0.95. The installed `useAuthToken` hook supports bearer authentication for Convex HTTP actions. Storage supports reading and writing blobs from actions. The [product notes](../../../docs/Site-Ahead-Idea.md), [request examples](../../../docs/Third_Party_Form_Examples.docx), and [roadmap](../../../docs/roadmap.md) inform the distinction between reusable forms and job outputs. Agent execution remains future work.

## Goals / Non-Goals

Keep document ownership separate from job references. Preserve the exact file bytes assigned to a job without duplicating files for every job. Reuse membership checks, storage, declarative routes, and existing form and dialog components.

This design adds no agent state, search embeddings, file parsing, folder hierarchy, general attachment framework, or custom permission system. Job attachments are assigned at job creation; this version adds no controls to change attachments on an existing job.

## Decisions

### Store documents and file versions separately

Add two tables:

| Table | Fields and indexes |
| --- | --- |
| `documents` | `organizationId`, `title`, `description`, `searchText`, `archived`, `currentVersion`; index by organization ID and archived state; text search index with organization ID and archived filters |
| `documentVersions` | `documentId`, sequential `number`, `storageId`, original `filename`, `contentType`, byte `size`, and `uploadedBy`; indexes by document ID and number, and by storage ID |

Use Convex creation timestamps for upload dates. Document ownership comes from `documents.organizationId`; versions inherit ownership through their parent. `storageId` is an `Id<"_storage">`. Do not persist or expose a direct storage URL. Version metadata and file bytes are immutable. Titles and descriptions remain editable on active documents.

Create the document with `currentVersion: 1` and its first version together in an internal mutation after file storage succeeds. This avoids a temporary document without a file. Replacement reads and increments the document's current version and inserts the version in one mutation. Concurrent replacements serialize through that document. Existing versions remain stored.

Keeping only a mutable file ID would lose the file used by an older job. Copying files per job would add duplicate storage and cleanup work. Two tables and explicit version references satisfy the agreed behavior without either approach.

### Authenticate uploads and downloads

Use Convex HTTP actions in `convex/documentFiles.ts`, registered alongside the existing auth routes. Upload a single file and its metadata through an authenticated request. A replacement also names the existing document. The browser sends the current token in the Authorization header using `useAuthToken`; never put it in a URL. The backend supplies its platform-provided Convex HTTP origin so the frontend does not guess a deployment URL.

Check active membership before reading an upload. Enforce the accepted PDF, DOC, and DOCX filename and content-type rules and the actual nonempty byte size on the server. The proposed 10 MB limit means 10,000,000 bytes. Store opaque files without extracting their contents. Validate metadata before storage, then recheck membership, original organization, and document state in the final internal mutation. This prevents a removal, organization change, or archive during transfer from committing stale access.

If finalization fails, use an internal mutation to check the storage ID index before deleting the new blob. A lost response after a successful commit must not delete a referenced file. A process interruption between storage and finalization can leave an unreferenced blob; it must never become a library entry or be downloadable through the application. Do not add a background cleanup service for this first version.

Downloads accept a document version ID. An internal query checks current membership and the version's parent organization before the HTTP action reads its storage ID and returns bytes. Archived versions remain downloadable. Return an attachment filename, the saved content type, and private no-store cache headers. The frontend downloads the fetched blob and releases its temporary object URL. Handle CORS preflight and Authorization headers for the existing local and hosted frontend origins without changing Google callback routes.

Direct Convex file URLs allow access to anyone holding the URL and cannot be revoked by removing membership. Authenticated HTTP actions preserve the existing access rules. Their response limit is 20 MB, so the 10 MB upload limit also bounds downloads. These choices follow the [Convex storage security model](https://docs.convex.dev/file-storage/overview) and [serving files guidance](https://docs.convex.dev/file-storage/serve-files).

### Keep template references current and job references fixed

Extend `templateItemValidator` with an optional bounded array of document IDs. Extend checklist items with an optional bounded array of document version IDs. An absent field means that the record has no attachments, allowing existing data to remain valid without a backfill. New writes save explicit arrays. Derive frontend types from the shared validators or generated document types.

Category saves validate distinct references, organization ownership, and active state. Limit references to 10 per item, alongside the existing 100-item template limit. Resolve the metadata for saved selections independently of active search results so archived references remain visible and removable in the form. A template that became invalid through archiving must have its references repaired before it can be saved again.

In `jobs.create`, resolve each selected document and its current version inside the same mutation that creates the input, job, and checklist. Validate all references before writing. Cache repeated document lookups within that invocation. A concurrent replacement or archive invalidates reads and causes Convex to retry against the current records. Creation either assigns versions from active documents or rejects the whole transaction with the affected item and document identified.

Read downloads from the versions saved on checklist items. Never recompute them from the current category or current document version. Category edits, category reassignment, checklist status changes, and job deletion preserve the shared document records and version files. Old jobs without references remain unchanged.

```text
Template item --> Document --> Current version
                    |
                    +--> Version 1 <-- Job A checklist item
                    |
                    +--> Version 2 <-- Job B checklist item
```

### Search metadata and archive without cascading changes

Maintain `searchText` from title and description in the same mutation that changes those fields. Use Convex's native text search with organization ID and active-state equality filters. Empty search uses the ordinary organization/state index. Both paths paginate. This fits the agreed metadata search and avoids file extraction or a new search dependency. See [Convex full text search](https://docs.convex.dev/search/text-search).

Archiving changes only the document's state. It does not scan or rewrite categories, jobs, or file versions. Category reads show archived references; job creation rejects them. Active listing, search, and pickers exclude archived documents. Direct details and existing references can still display them as read-only. Repeated archive requests leave the document archived. Restore, purge, and a separate version-history browser are outside this first implementation.

### Add library screens and item downloads

Declare `/app/library` and `/app/library/:documentId` in `src/routes.tsx` beneath the existing membership layout. Add Library navigation for both roles and extend the breadcrumb labels. Keep library search in a query parameter and unsaved upload fields in component state.

Use `src/pages/library/library-page.tsx` for paginated listing, title/description search, and an upload dialog. Use `library-document-page.tsx` for details, metadata edits, replacement, downloads, and archive confirmation. Place feature components alongside these screens in `src/pages/library/components/`. Show current version metadata and a clear archived state.

Add an active-document picker to each category template row. The picker supports title/description search, selected-file labels and downloads, and removal of archived references. Show assigned document filenames, versions, and download actions beside each job checklist item. Reuse a small download helper/component outside generated UI primitives across the library, category form, and job page.

## Risks / Trade-offs

- Original files and every assigned version consume storage. Archive preserves them deliberately; deletion policy is deferred.
- A failed or interrupted transfer needs a visible retry state. Only a finalized upload changes the current version.
- Archiving can block new jobs from a category until a member repairs its template. The creation error must identify what to fix and link to that category.
- Membership removal stops subsequent downloads. Bytes already delivered or downloaded cannot be retracted.
- The file-size and attachment-count limits are proposed defaults. Keep them in shared constants and show them where users select files or references.

## Migration Plan

The organization tenancy dependency is complete. Add the two empty tables, indexes, and optional reference fields to the current backend. Preserve all existing organizations, jobs, categories, and file data. Deploy the new backend before enabling library controls in the frontend; regenerate the tracked Convex bindings.

An older category form drops unknown entry fields when saving. Coordinate the frontend rollout on the shared preview backend and verify using the matching build. Roll back frontend controls if needed while retaining backend support for the new fields and existing stored files. Do not redeploy a schema that rejects populated document references or erase data to roll back this feature.
