## Context

See `proposal.md` for the motivation and behavioral scope. The current Convex app mounts `@convex-dev/agent` and already contains a classifier, Langfuse/OpenTelemetry handlers, and live AirWatch, VicTraffic, and DataVic resolver code in `convex/agents/checklist`. The public classifier currently accepts a simplified checklist payload and returns normalized classifications; it does not update saved items or dispatch work. `checklistItems` contains `jobId`, `title`, `kind`, `status`, `notes`, and optional `documentVersionIds`, with `kind` limited to the three canonical values and `status` limited to `pending | done`. There is no per-item Agent state table. The organization document library already has immutable `documentVersions` containing Storage IDs, category document references, and versions pinned to checklist items on creation. Reuse it.

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

Use reusable Evidence and Request `Agent` definitions from `@convex-dev/agent`. A dispatcher schedules one bounded action per eligible item so items can run concurrently. The action claims the item state before starting, records each stage, and releases it as `waiting`, `finished`, or `failed`. Retries and newly supplied information reuse the same thread and run only that item. A run guard checks the stored run ID, state, initiating member’s current organization access, full item snapshot, and relevant job/input/category context before every tool effect and result save. This rejects late or duplicate actions, deletion, category/address/input changes, and item edits without overwriting human work. A scheduled deadline records failed crash recovery; retry then resumes the same thread. Keep histories bounded.

The parent dispatcher decides eligibility from the saved `kind`; an LLM is not used to decide whether an on-site item receives an agent. Each specialist Agent receives only the tools allowed for its item. Tool descriptions state the checklist titles they serve, required inputs, response shape, and stopping condition. A job-context tool reads the item-associated job and input through internal Convex operations rather than accepting owner IDs or arbitrary database paths.

### Wrap the three live automated sources behind validated tools

Expose separate tools for construction year, air quality, and road closures. Construction year queries the DataVic CKAN `datastore_search` endpoint for the building-information resource and applies the `constructionYear < 1990` rule after validating the returned record. A valid DataVic year takes precedence. A successful exact-address miss or matching record with no year allows a fallback to an available validated contractor-provided year for that job. Save the chosen year, `manual_fallback` resolution, supplying member and time, and the DataVic lookup outcome as provenance. Do not describe a manual result as API-verified. If neither source supplies a year, save an explicit unresolved result and leave the item pending. Air Quality uses the existing EPA AirWatch endpoint, requires saved job coordinates, and selects a validated nearby monitoring-site response with explicit distance and source-time context; statewide success alone is not site evidence. Road Closure uses bounded VicTraffic pagination and exact normalized saved road/locality selection. Missing location yields explicit unresolved information, and incomplete or invalid responses cannot establish absence of relevant closures. Each adapter validates the external payload before returning a typed result with source, observed time, and relevant records. AirWatch selects the nearest station within a 25 km demo coverage radius and a reading at most six hours old; these are bounded data-selection defaults, not health or safety thresholds, and are exposed with the actual station distance and reading time. A station reading is explicitly an ambient proxy rather than a worksite measurement. Road findings retain a complete snapshot and exact filters, reject snapshots older than 24 hours, and never describe zero published matches as guaranteed clear access. The longer road window accommodates the observed cached public feed. Responses are streamed with a 5 MB cap (observed VicTraffic pages contain about 3.3 MB / 2,000 records), a 15-page road ceiling, and at most 100 persisted matches.

The current adapter accepts optional `context.constructionYear`, but the job database has no persisted manual-year field. Backend must provide an optional contractor-confirmed year and its attribution through the server-derived job context, scoped to the item's organization and job. Leave it absent when no value has been supplied; do not require a new top-level Agent input or alter the checklist item fields. Reuse the current year validation: an integer from 1800 through the current UTC year. The Agent must not turn notes, estimates, or model guesses into confirmed manual input. Loading and validating this optional value is part of the shared Backend contract, not a requirement to collect a year for every job.

The Agent marks an automated item done only after its result has been validated and persisted, including a finding based on a validated manual year. A timeout, non-2xx response, unsuccessful CKAN response, malformed payload, invalid year, or save failure keeps the item pending and records a failed state with the attempted source and current step. These failures must not activate the manual fallback. A successful lookup with no matching building or an absent year is a data-coverage outcome; it becomes unresolved only when no manual year is available. Provider keys and secrets remain server-side.

### Implement one runtime skill per third-party form

Runtime skills are small form-specific modules with a name, a description explaining when to use them, and instructions for filling that form. Each skill includes the form's request type, supported PDF or DOCX method, required fields, trusted job-data sources, formatting rules, and explicit missing-value behavior. The guidance is the form-specific knowledge; it is not a generic agent prompt.

Use minimal form-key/skill compatibility metadata on immutable library versions. Select only among the assigned item's pinned `documentVersionIds`; never silently switch an existing job to a new library version. There is no parallel catalog or duplicate source blob. Seed clearly labeled sample PDF/DOCX request drafts into this existing organization library and link them through the category's document references before creating demo jobs. Unsupported arbitrary uploads do not become fillable merely because they carry a compatible filename.

The Request sub-agent uses actual skill-selection, context-read, form-read, and fill/save tools. Each skill maps fields to trusted saved job/context values. Tools derive those values themselves and never persist arbitrary model-supplied values as verified data. Filling supports only the declared PDF form fields or DOCX placeholders, with explicit structural validation. It stores a new draft Storage ID and source version ID, missing fields, provenance, and next action, then stops waiting. Authenticated download access derives the item, job, and current organization membership; it does not expose an unrestricted Storage URL. The original version and file remain unchanged.

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
