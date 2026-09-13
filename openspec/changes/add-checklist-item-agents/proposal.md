## Why

Checklist items currently contain only a title, kind, binary status, notes, and optional pinned document versions. They do not classify or resolve work independently, retain Agent progress, or give contractors a reviewable draft for third-party requests. This change adds live checks and resumable per-item work while preserving `pending | done` checklist status.

## What Changes

- Accept server-provided `checklistItems` records as Agent input; process pending records and leave done records unchanged on later runs.
- Classify each pending item as `automated`, `third_party`, or `on_site`, updating `checklistItems.kind` only for valid classifications.
- Use live tools for construction-year lookup through the DataVic building-information API, EPA AirWatch, and Transport Victoria road disruptions. If a successful DataVic lookup finds no usable year, use an available validated contractor-provided year from the same job and label its source as manual. Without either source, remain unresolved and pending; API failures stay explicit failures.
- Keep `on_site` items human-controlled and do not create sub-agents for them.
- Create one persistent Convex Agent thread and independent sub-agent run for every eligible pending item, scheduled concurrently without overlapping runs.
- Reuse the organization document library and item-pinned immutable versions, with minimal form compatibility metadata and no duplicate form catalog.
- Add exactly two runtime skills for the uploaded Building Permit — Carpentry PDF and Occupancy Permit — Carpentry DOCX. GPT-5.5 selects the appropriate skill and scoped tools. Fill the real saved job address and available confirmed details, use a consistent fictional profile for missing general demo fields, label the draft and demo provenance, and leave signatures, signing dates, declarations, and approval/certificate references for human confirmation.
- Expose authenticated run/retry, missing-data input, result viewing, and scoped draft download controls; protect human changes and recover crashed runs explicitly.
- Persist per-item Agent state and structured output, including thread/run IDs, execution state, current step, errors, trace ID, findings or drafts, provenance, missing information, and next action.
- Mark API and model failures explicitly, preserve the item kind and pending status, support retry on the same thread, and never send third-party requests automatically.

## Capabilities

### New Capabilities

- `checklist-item-agents`: Classify, dispatch, observe, resume, and persist independent Agent work for checklist items.

### Modified Capabilities

- `job-management`: Extend checklist-item behavior to allow internal Agent processing while preserving binary item statuses, organization membership checks, manual on-site completion, and independent notes.

## Impact

Touches `convex/agents/**`, Convex actions and internal mutations, the shared schema/contracts, existing organization document/version records and new draft files, Agent skills, live API adapters, and Langfuse/OpenTelemetry configuration. Backend-owned persistence and generated bindings are dependencies; existing authentication and public manual checklist APIs remain compatible.
