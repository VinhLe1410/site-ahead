> PR #17 preserves the completed automated backend checkpoint. The active follow-up adds exactly two Carpentry form skills, GPT-5.5 Request execution, labeled fictional general demo data, and minimal existing-checklist review/download controls. Only actual saved job input supplies the property address. Human confirmation fields remain blank. The user approved replacing the temporary-structure Occupancy upload with the Boroondara general building application as a new immutable version. The final native browser download-save check in 6.1 has now passed. The follow-up demo refinements are tracked in section 8. See docs/verification/request-form-agents.md for evidence.

## 1. Establish the shared Convex contract

- [x] 1.1 Coordinate with the Backend owner to add validators and indexes for one per-item Agent-state record and minimal form compatibility metadata on existing document versions, while leaving `checklistItems.kind`, `checklistItems.status`, and `checklistItems.notes` compatible with their existing validators; verify `npx tsc --noEmit` and Convex schema validation pass.
- [x] 1.2 Define typed internal operations to create or claim an item state, update current step, save structured output, mark waiting/finished/failed, and resume an existing thread; verify active organization membership access is derived from the item’s job and stale run IDs cannot overwrite newer state.
- [x] 1.3 Inspect and register the existing Building Permit PDF and authorized replacement Occupancy Permit DOCX versions with stable form keys and validated structure/fingerprints; reuse their Storage files and idempotently link the matching Carpentry category items so new jobs pin those versions. Preserve the original Occupancy upload as version 1. Verify source versions remain byte-identical and no duplicate catalog is created.
- [x] 1.4 Coordinate with Backend to persist an optional contractor-confirmed construction year and supplying member/time, and expose it through the item-associated job context; validate the year as an integer from 1800 through the current UTC year, enforce organization access, and verify absence does not change the full-checklist-record input contract or require a year for every job.

## 2. Classify and dispatch checklist items

- [x] 2.1 Refactor the classifier boundary to accept server-provided full `checklistItems` records, filter to `pending` items, preserve `done` items, validate one result per item, and persist valid `kind` overrides; verify a mixed pending/done input produces no work for done items.
- [x] 2.2 Implement classification failure handling that preserves the previous kind, records a failed state with reason and Langfuse trace ID, and schedules no item sub-agent; verify missing, duplicate, invalid, and model-error outputs through the existing classification verification command.
- [x] 2.3 Implement the deterministic dispatcher that creates one persistent thread for each pending `automated` or `third_party` item, skips `on_site`, schedules eligible runs concurrently, and prevents duplicate threads or overlapping runs; verify a mixed checklist starts only the eligible items.
- [x] 2.4 Implement same-thread retry and resume after a failed run or newly supplied contractor information; verify retry changes only the selected item’s state and preserves its prior thread context and other items’ outputs.

## 3. Add validated live automated tools

- [x] 3.1 Complete the DataVic construction-year adapter against the CKAN `datastore_search` resource, including exact normalized-address matching, construction-year validation, and the `constructionYear < 1990` finding. After a successful lookup with no matching record or an absent year, use an available validated contractor-provided year from the server-derived job context; verify DataVic takes precedence, fallback saves manual provenance and the lookup outcome, and absence of both sources remains unresolved and pending. Reject unsuccessful CKAN responses and prevent API/validation failures from activating the fallback.
- [x] 3.2 Keep the EPA AirWatch and Transport Victoria adapters behind separate Agent tools with bounded requests, strict response validators, source timestamps, and location selection; verify each live endpoint returns the typed result captured by the existing automated-check verification scripts.
- [x] 3.3 Register item-specific tool descriptions and allowlists so the Evidence sub-agent selects only the matching construction-year, air-quality, or road-closure tool; verify a basic Agent run invokes the intended tool and rejects an unrelated item/tool pairing.
- [x] 3.4 Persist a validated automated finding, including manual provenance when fallback is used, before changing `checklistItems.status` from `pending` to `done`; verify API, validation, and persistence errors leave the item pending and record a failed state even when a manual year exists. Verify a successful DataVic lookup with no usable year and no manual value records an explicit unresolved result.

## 4. Build form-specific Request skills

- [x] 4.1 Add exactly two runtime skills with names, use descriptions, actual PDF/DOCX mappings, trusted job sources, a consistent fictional general profile, protected human fields and missing-value rules. Use GPT-5.5 at medium reasoning for Request execution and verify it selects the matching skill/tool; do not silently substitute a model or alter Evidence Agent model selection.
- [x] 4.2 Add scoped database and form-storage tools that load the item-associated job/input/category, resolve the compatible source among the item’s pinned document versions, and read the source PDF or DOCX without accepting arbitrary owner IDs or paths; verify structured stage logs identify the selected file and trusted field names without exposing their contents or secrets.
- [x] 4.3 Fill the actual uploaded PDF layout and DOCX structure, including a verified overlay if the PDF has no interactive fields. Use the saved job address and confirmed details before approved demo defaults; preserve form identity, leave protected human fields blank, reject changed layouts/overflow, and render every output page for visual verification. Save each draft to a new Storage ID while preserving source bytes.
- [x] 4.4 Save the draft Storage ID, source version ID, structured missing/human fields, database versus demo provenance, and next action. Label the file as a demo draft, leave the item pending and stop in `waiting`; verify no request is sent and no fictional default becomes a confirmed job fact or automated finding.

## 5. Add observability and failure visibility

- [x] 5.1 Enable `experimental_telemetry` on every classifier and item-agent generation/stream call and attach the resulting Langfuse trace ID to the item state; verify traces are reachable with the existing Langfuse smoke-test and agent verification commands.
- [x] 5.2 Extend shared observability with structured stage logs for classification, dispatch, skill selection, database lookup, API call, form read/fill, persistence, and waiting; include item/thread/run/tool identifiers and redact provider secrets, authorization headers, and unnecessary document contents.
- [x] 5.3 Ensure every model, tool, form, and persistence failure records `failed` or `waiting`, current step, actionable error, and trace ID; verify no run is reported as finished unless its required structured output and save mutation succeed.

## 6. Integrate contractor controls and adversarial checks

- [x] 6.1 Automatically schedule server-derived full-record classification after job creation saves its checklist; add minimal authenticated controls to start existing saved-checklist processing, retry classification or resume one item, inspect progress/findings, supply structured missing job data and contractor-confirmed year, and download request drafts. Verify reload persistence and preserve manual notes/checkbox behavior without automatic dispatch.
- [x] 6.2 Verify atomic duplicate claims, bounded concurrency, explicit crash recovery, stale late writes, job/item deletion or editing during runs, initiating member removal, and classification/execution retry isolation. Verify rejected saves preserve human changes and other item outputs.
- [x] 6.3 Verify form tools derive values only from saved records and the approved demo profile, preserve pins across library replacement, reject unsupported templates/model field fabrication, and deny cross-organization draft downloads. Verify both actual PDF/DOCX drafts, blank signatures, protected human fields, source preservation and cleanup of rejected or superseded generated files.

## 7. Integrate and verify the Agent journey

- [x] 7.1 Run the Carpentry & Renovation acceptance journey with construction year, Air Quality, and Road Closure as automated items, Asbestos as on-site, and the permit/occupancy items as third-party; verify valid kind updates, independent concurrent states, binary checklist statuses, and no Powerlines work.
- [x] 7.2 Demonstrate a DataVic no-match item using an available valid manual year and saving its attribution before completion; demonstrate no manual year leaving the item automated and pending, an API failure remaining failed despite an available manual year and retrying on the same thread, and a third-party item producing a reviewable PDF or DOCX draft with missing fields. Verify other item runs continue independently.
- [x] 7.3 Run `npm run verify:classification`, `npm run verify:langfuse`, `npm run build`, and `npm run check`; resolve TypeScript, lint, formatting, OpenSpec, and Convex deployment validation failures before handoff.

## 8. Address demo feedback

- [x] 8.1 Show specific saved road-disruption examples with timing, impact, description and source, an expandable remainder, and honest zero-match coverage.
- [x] 8.2 Derive a current Job Brief with completed findings and suggested next actions in priority order; preserve original input and distinguish pending drafts, failures, running work and manual completion. Verify state-sensitive summary behavior.
- [x] 8.3 Preserve a demo job with live construction-year, air-quality and road findings, and drafts using that same saved address. Verify the revised browser journey and run the quality checks.
