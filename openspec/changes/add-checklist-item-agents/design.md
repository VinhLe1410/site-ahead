> The automated backend checkpoint is preserved in PR #17. This follow-up completes the two-form Request Agent PoC and minimal review/download controls. It supports the uploaded Building Permit — Carpentry PDF and Occupancy Permit — Carpentry DOCX only. The user has authorized fixed fictional general data for these drafts; actual saved job addresses and confirmed values take precedence, and protected human fields remain blank.

## Context

See `proposal.md` for the motivation and behavioral scope. The current Convex app mounts `@convex-dev/agent` and already classifies full saved records, runs the three live automated checks, persists per-item state and threads, and exposes authenticated start/retry/context operations. Langfuse traces, bounded dispatch, stale-run guards and crash recovery are implemented. `checklistItems` retains `pending | done`, notes and pinned `documentVersionIds`. The organization document library has immutable `documentVersions` with Storage IDs and category document references. Reuse these foundations for the Request Agent.

Backend owns `convex/schema.ts`, `convex/contracts.ts`, generated bindings, and persistence operations. The Agent owner owns `convex/agents/**`. Existing authentication and manual checklist mutations remain the public active organization membership boundary.

## Goals / Non-Goals

**Goals:**

- Process server-provided full checklist item records without trusting client-supplied copies.
- Classify pending items, persist valid kind changes, and dispatch independent resumable work.
- Resolve the agreed live automated checks and persist validated evidence or explicit failures.
- Give each third-party request a form-specific skill that can fill a PDF or DOCX draft from verified job data.
- Persist item execution, structured output, trace IDs, and failure reasons so progress survives reloads and never silently disappears.

**Non-Goals:**

- Changing the checklist item's binary status vocabulary or replacing manual on-site work.
- Automatic sending, email watching, inbox matching, or portal submission.
- Powerline checks, additional trades, a general agent network, or a workflow engine for unrelated work.
- Moving Codex/Claude development skills into the runtime Agent. Runtime skills are authored beside the Convex Agent code.

## Decisions

### Use the existing item record as the input boundary

Job creation schedules classification only after saving the checklist in its transaction, capturing the authenticated initiating member. Explicit start controls use the same boundary for existing jobs. The dispatcher receives full server-provided `checklistItems` documents. Internal Agent actions consume these full records, including `_creationTime` and optional `documentVersionIds`; no separate top-level job ID is required. The authenticated public boundary accepts item IDs and derives full records server-side. The action loads the associated job, input, category, and current item again before executing. It considers only `pending` items and skips `done` items on retries. This keeps the database authoritative and prevents stale or client-modified context from driving API calls.

### Keep checklist status separate from Agent execution state

Add one per-item Agent-state record, keyed by checklist item ID, rather than adding operational fields to `checklistItems`. The record contains the optional persistent execution Agent thread ID, separate classification attempt state, latest execution run ID, execution state (`idle`, `running`, `waiting`, `finished`, or `failed`), current step, error, Langfuse trace ID, finding or draft output, provenance, missing information, next action, and draft/source Storage IDs when applicable. An indexed lookup inside an atomic mutation creates or claims the state; the index is not itself a uniqueness constraint. Thread creation participates in that same transaction. No execution thread exists before successful eligible classification. Classification retries cannot replace an existing execution attempt or restart other items.

The classification mutation updates `checklistItems.kind` only after validating each item’s one-to-one classifier result. A missing, duplicate, or unsupported result preserves the previous kind, writes a failed Agent state, and does not dispatch the item. A valid result is followed by deterministic dispatch: automated and third-party items are eligible, and on-site items are skipped.

### Use bounded Convex Agent actions and persistent threads

Use reusable Evidence and Request `Agent` definitions from `@convex-dev/agent`. A dispatcher schedules one bounded action per eligible item so items can run concurrently. The dispatcher atomically claims a lease and creates or reuses the thread before scheduling the action. It permits three concurrent runs per job, keeps remaining items queued, and drains the queue as siblings finish or fail. Each action records stages and releases its lease as `waiting`, `finished`, or `failed`. Retries and newly supplied information reuse the same thread and run only that item. A run guard checks the stored run ID, state, initiating member’s current organization access, full item snapshot, and relevant job/input/category context before every tool effect and result save. This rejects late or duplicate actions, deletion, category/address/input changes, and item edits without overwriting human work. A three-minute scheduled lease deadline records failed crash recovery; retry then resumes the same thread. Queued attempts have monotonically increasing IDs and a 30-second recovery check; a two-hour ceiling covers the supported 100-item checklist at the concurrency and lease limits. Human edits invalidate the active snapshot immediately, including edits later reverted, while retaining its lease until the worker stops. The state retains only its latest structured output and bounded result arrays; model context uses 20 recent messages and persistent thread history remains intact across retries. Deleting the owning job schedules separate thread cleanup transactions with bounded message pages.

The parent dispatcher decides eligibility from the saved `kind`; an LLM is not used to decide whether an on-site item receives an agent. Each specialist Agent receives only the tools allowed for its item. Tool descriptions state the checklist titles they serve, required inputs, response shape, and stopping condition. A job-context tool reads the item-associated job and input through internal Convex operations rather than accepting owner IDs or arbitrary database paths.

### Wrap the three live automated sources behind validated tools

Expose separate tools for construction year, air quality, and road closures. Construction year queries the DataVic CKAN `datastore_search` endpoint for the building-information resource and applies the `constructionYear < 1990` rule after validating the returned record. A valid DataVic year takes precedence. A successful exact-address miss or matching record with no year allows a fallback to an available validated contractor-provided year for that job. Save the chosen year, `manual_fallback` resolution, supplying member and time, and the DataVic lookup outcome as provenance. Do not describe a manual result as API-verified. If neither source supplies a year, save an explicit unresolved result and leave the item pending. Air Quality uses the existing EPA AirWatch endpoint, requires saved job coordinates, and selects a validated nearby monitoring-site response with explicit distance and source-time context; statewide success alone is not site evidence. Road Closure uses bounded VicTraffic pagination and exact normalized saved road/locality selection. Missing location yields explicit unresolved information, and incomplete or invalid responses cannot establish absence of relevant closures. Each adapter validates the external payload before returning a typed result with source, observed time, and relevant records. AirWatch selects the nearest station within a 25 km demo coverage radius and a reading at most six hours old; these are bounded data-selection defaults, not health or safety thresholds, and are exposed with the actual station distance and reading time. A station reading is explicitly an ambient proxy rather than a worksite measurement. Road findings retain a complete snapshot and exact filters, reject snapshots older than 24 hours, and never describe zero published matches as guaranteed clear access. The longer road window accommodates the observed cached public feed. Responses are streamed with a 5 MB cap (observed VicTraffic pages contain about 3.3 MB / 2,000 records), a 15-page road ceiling, and at most 100 persisted matches.

The saved job context already provides an optional contractor-confirmed year with member/time attribution. Leave it absent when no value has been supplied; do not require a new top-level Agent input or alter the checklist item fields. Reuse the current year validation: an integer from 1800 through the current UTC year. The Agent must not turn notes, estimates, model guesses, or request-demo profile values into confirmed manual input.

The Agent marks an automated item done only after its result has been validated and persisted, including a finding based on a validated manual year. A timeout, non-2xx response, unsuccessful CKAN response, malformed payload, invalid year, or save failure keeps the item pending and records a failed state with the attempted source and current step. These failures must not activate the manual fallback. A successful lookup with no matching building or an absent year is a data-coverage outcome; it becomes unresolved only when no manual year is available. Provider keys and secrets remain server-side.

### Implement one runtime skill per third-party form

Implement exactly two runtime skills as small form-specific modules with a name, a description explaining when to use them, and instructions for filling that form. Reuse `building-permit-request` for Building Permit — Carpentry (`BUILDING-PERMIT-APPLICATION.pdf`) and `occupancy-inspection-request` for Occupancy Permit — Carpentry (`Occupancy-residential-application.docx`). Each skill includes the request type, actual field mapping, supported filling method, trusted job-data sources, approved demo defaults, formatting rules and protected human fields. Do not add Certificate of Consent, BYDA, insurance or generic arbitrary-form support.

Use minimal form-key/skill compatibility metadata on immutable library versions. Register the existing Building Permit version and the explicitly authorized replacement Occupancy version after inspecting their actual structure. The original Occupancy upload is for prescribed temporary structures; retain it as version 1 and use the City of Boroondara general building Occupancy application as version 2. Both Occupancy documents are numbered Form 15; their scope, not their number, distinguishes them. The replacement comes from the council's [building permit applications page](https://www.boroondara.vic.gov.au/services/planning-and-building/building/building-permits-and-approvals/apply-amend-or-extend-building-permit). Preserve each council's preprinted identity and record recipient/jurisdiction suitability as requiring human confirmation. Link the matching category template items so new jobs pin their source versions. Select only among the assigned item's pinned `documentVersionIds`; never silently switch an existing job to a new library version. Titles locate the initial uploads but do not establish format compatibility. Bind format-specific mappings to a verified source version or content fingerprint so changed layouts fail explicitly. There is no parallel catalog.

The Request sub-agent uses `gpt-5.5` with medium reasoning and actual skill-selection, context-read, form-read, and fill/save tools. No silent model substitution is allowed. Keep dependency ordering and tool allowlists enforced in code; model intelligence does not replace validation. The existing Evidence Agent model stays unchanged.

The user-authorized PoC exception allows a fixed fictional Ironbark profile for missing general fields such as applicant/company/contact details and an illustrative work description. Both forms and retries use the same profile. The saved job address is always real input, and confirmed saved details take precedence over demo defaults. Tools derive all values from those sources; arbitrary model-supplied values are not accepted as verified facts. Mark fictional values with `demo_data` provenance and label the generated document as a demo draft. Demo defaults are never written back as confirmed job facts or used by live evidence tools. Applicant signature/signing date, attestations, declarations, approval or certificate references and unsupported claims of attachments remain blank or unchecked and appear in structured missing information.

Use `docs/Third_Party_Form_Examples_Update.docx` for domain guidance. Its Building Permit section describes fields; its Occupancy section explicitly does not verify Form 5 fields. The actual uploaded files govern each mapping. Support the observed PDF fields or verified coordinate overlay and the observed DOCX controls, fields or table structure; do not rebuild a generic lookalike form. Visually inspect every page of both filled outputs. Store each draft as a new file with its source version, field provenance, missing information and next action, then stop in `waiting`. Authenticated download derives item, job and active organization membership without an unrestricted Storage URL. Preserve source bytes and prior human work; clean up rejected draft writes and superseded generated files safely.

### Make observability part of the state machine

Reuse the existing Langfuse/OpenTelemetry integration and enable telemetry on every model generation or stream call. Extend the shared handlers with structured stage logs for classification, dispatch, skill selection, database lookup, API call, form read/fill, persistence, and wait conditions. Logs identify the item, thread, run, tool or skill, and outcome while redacting provider secrets, authorization headers, and unnecessary document contents. The saved actual OpenTelemetry trace ID links classification and item runs to Langfuse. Failure recording survives telemetry/export errors; errors are sanitized and raw prompts, responses, document contents, secrets, and authorization headers are not logged. Exporter flush remains enabled. A run cannot be reported as finished unless its required structured output and persistence mutation succeed.

### Preserve manual checklist behavior

Keep `checklistItemStatusValidator` as `pending | done` and keep the existing checkbox and notes mutations. Automated results may move an item from pending to done only after validated persistence. Third-party drafts remain pending until later human actions. On-site items have no Agent state that runs work and can become done only through the existing manual control. Manual checkbox or note changes do not dispatch Agent actions and do not overwrite Agent output.

## Risks / Trade-offs

- [DataVic coverage is limited and may not match an address] → After a successful lookup with no usable year, use an available validated contractor-provided year with manual provenance; otherwise remain unresolved and pending. Never infer a year or hide an API failure with fallback data.
- [External APIs change response shapes or availability] → Keep per-source adapters with strict validators, bounded timeouts, and explicit failed states; verify each live source before dispatch integration.
- [PDF and DOCX filling differs by file structure] → Require each skill to declare its supported filling method and fail visibly for unsupported or non-fillable files; preserve the original file.
- [Concurrent retries race with earlier actions] → Claim runs atomically, persist a run ID, and reject stale result writes.
- [Agent logs can expose sensitive job or form data] → Redact secrets and minimize payload logging while retaining stage, outcome, and trace identifiers.
- [Backend schema and generated bindings are shared with other owners] → Land the state and library-version validators and internal mutations through the Backend owner before enabling dispatch; keep the change additive and preserve existing public APIs.

## Migration Plan

1. Agree and land the shared validators, per-item Agent-state table, minimal library-version compatibility metadata, indexes, internal persistence mutations, and optional contractor-provided construction-year context with Backend.
2. Seed the initial sample PDF/DOCX forms into the organization document library, then add the form-specific runtime skills and database/form tools.
3. Extend the existing classifier to consume full item records, persist valid kind changes, and record failed classification states.
4. Add the live DataVic, AirWatch, and VicTraffic tools behind the specialist Evidence Agent and verify live success, manually sourced fallback, unresolved, and explicit failure paths.
5. Add the Request Agent, concurrent dispatcher, same-thread retry path, and stale-run guards.
6. Add minimal authenticated controls for processing, item-specific retry/resume, missing saved context, findings, and draft downloads. Preserve existing manual checklist controls.
7. Enable Langfuse telemetry and structured stage logging for every Agent action, then run the acceptance scenarios and `npm run check`.

Rollback is additive: disable dispatch or stop scheduling new runs, leave existing checklist statuses and manual mutations available, and retain Agent-state and draft files for diagnosis. Do not delete original form files or saved drafts during rollback.
