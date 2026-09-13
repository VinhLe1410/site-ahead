Dependency: organization tenancy is merged and archived. No active change blocks this work. Schema, shared contracts, generated bindings, HTTP routes, and integration changes must stay coordinated with category and job work on the same backend. Follow [design.md](design.md) for storage and version decisions and [specs/](specs/) for acceptance behavior.

## 1. Document records and access

- [x] 1.1 Extend `convex/schema.ts` and `convex/contracts.ts` with document and version records, indexes, accepted file limits, and optional template document IDs and item version IDs. Derive extended types from existing validators or generated types. Verify existing category and checklist records still satisfy the schema and that the new reference arrays are bounded.
- [x] 1.2 Add document and version ownership helpers in `convex/access.ts` and library queries/mutations in `convex/documents.ts`. Implement paginated active listing, title/description search, details, metadata editing, and archive. Verify owner and staff access within one organization, rejection across organizations, and archived records disappearing from active results while remaining readable by reference.

## 2. File uploads and downloads

- [x] 2.1 Add authenticated uploads in `convex/documentFiles.ts`, register them in `convex/http.ts`, and finalize document creation or replacement through internal mutations. Validate file type, nonempty bytes, size, and metadata; recheck membership and active document state before committing; clean up the new blob after rejected finalization. Verify PDF, DOC, and DOCX uploads, rejected oversized/unsupported files, successful version increments, and failed replacements preserving the current version.
- [x] 2.2 Add authenticated version downloads and frontend transfer support using the installed Convex Auth token hook. Return original bytes and filenames with attachment and no-store headers, and support CORS for the existing frontend deployments. Verify downloaded files match their originals, archived versions remain downloadable, and signed-out, removed, or unrelated members receive no file bytes. Confirm no direct storage URLs or tokens appear in download links.

## 3. Checklist document references

- [x] 3.1 Extend `convex/categories.ts` validation and reads for template document references. Validate distinct active documents from the same organization and return metadata for saved selections, including archived references. Verify saving references survives reload, invalid references leave the category unchanged, and archived references remain identifiable for repair.
- [x] 3.2 Extend `convex/jobs.ts` creation to resolve current document versions inside the existing input/job/checklist transaction. Identify invalid references before writes and preserve the no-document and Uncategorized flows. Verify Job A retains version 1 after replacement, Job B receives version 2, and an archived reference rejects creation without partial records.
- [x] 3.3 Extend job reads to return assigned document metadata and review job editing/deletion and checklist mutations for reference preservation. Verify category reassignment and progress edits retain assigned versions, existing jobs gain no retroactive attachments, and deleting a job does not delete shared documents or files.

## 4. Library and checklist screens

- [x] 4.1 Add library routes and navigation in `src/routes.tsx` and `src/components/layout/app-layout.tsx`. Build `src/pages/library/library-page.tsx`, `library-document-page.tsx`, and their feature components for search, upload, metadata edits, replacement, download, and archive confirmation. Verify both roles can use the screens, search survives URL reload, archived details are read-only, and loading, empty, and failed-request states are distinguishable.
- [x] 4.2 Extend `src/pages/categories/components/category-form.tsx` with a document picker per checklist item. Derive the template type from shared contracts, preserve document references in submission mapping, and reuse the download control. Verify multiple documents can be selected and reopened, duplicates and limits are explained, and archived references can be removed or replaced.
- [x] 4.3 Show assigned filenames, version numbers, and downloads on `src/pages/jobs/job-page.tsx`. Present job-creation failures with access to the category needing repair. Verify downloads leave checkboxes, notes, and job status unchanged and that repairing a template allows creation to succeed.

## 5. Integration and verification

- [x] 5.1 Update `README.md` with the library flow, accepted formats and limits, replacement behavior, and archive behavior. Verify instructions describe downloads and metadata search accurately and keep AI retrieval and completed job documents outside this feature.
- [x] 5.2 Regenerate the tracked Convex bindings and verify the backend compiles and deploys to the intended development deployment. Use the matching frontend build and confirm existing data remains intact; coordinate shared preview use because older category forms drop new reference fields.
- [x] 5.3 Run `npm run check` and resolve failures. Verify TypeScript, lint, formatting, and strict OpenSpec validation pass.
- [x] 5.4 Run a short browser demo with an owner, staff member, and unrelated account: upload guidance and a blank form; search titles/descriptions; attach files to one template item; create Job A; replace a file and create Job B; download each job's assigned version; archive the document and confirm new-job creation fails; repair the template and retry. Verify old jobs still download their versions, category reassignment and job deletion preserve shared files, staff removal blocks subsequent downloads, and unrelated accounts cannot access document records or bytes.

## Verification record

Verified on the local frontend and `brainy-gopher-762` using temporary owner, staff, and unrelated organization accounts with Convex Auth sessions. Browser checks covered upload, multiple document selections, replacement, original job versions, archive confirmation and cancellation, archived references, template repair, search URLs, and live staff removal. Direct requests checked PDF/DOC/DOCX uploads, the 10 MB boundary, exact downloaded bytes, invalid references, reassignment, deletion, and organization isolation. Failed-upload cleanup preserved referenced files. Temporary accounts, organization data, stored files, auth sessions, and downloaded PDFs were removed after verification.

`npm run check` and the production frontend build passed. The final backend was deployed to development with the temporary fixture functions removed. Cleanup preserved the original organization, membership, two jobs, and two categories; no library documents, versions, or stored test files remained.

Merged the shared UI changes from `origin/main` at `8b91d5e`. Document selection remains part of category template rows, and downloads now render in the extracted checklist row with the new note editor. Library screens use the updated heading and list styles. `npm run check` and the production frontend build passed after conflict resolution.
