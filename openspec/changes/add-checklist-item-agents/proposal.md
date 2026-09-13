## Why

Checklist items currently contain only a title, kind, binary status, and notes. They do not classify or resolve work independently, retain Agent progress, or give contractors a reviewable draft for third-party requests. This change gives the Agent owner a bounded Convex implementation contract for live automated checks and resumable per-item work without changing the existing `pending | done` checklist status model.

## What Changes

- Accept server-provided `checklistItems` records as Agent input; process pending records and leave done records unchanged on later runs.
- Classify each pending item as `automated`, `third_party`, or `on_site`, updating `checklistItems.kind` only for valid classifications.
- Use live tools for construction-year lookup through the DataVic building-information API, EPA AirWatch, and Transport Victoria road disruptions. If a successful DataVic lookup finds no usable year, use an available validated contractor-provided year from the same job and label its source as manual. Without either source, remain unresolved and pending; API failures stay explicit failures.
- Keep `on_site` items human-controlled and do not create sub-agents for them.
- Create one persistent Convex Agent thread and independent sub-agent run for every eligible pending item, scheduled concurrently without overlapping runs.
- Add form-specific runtime skills that select a stored PDF or DOCX form, read job data, fill verified values, save a new draft file, and record missing fields and the next action.
- Persist per-item Agent state and structured output, including thread/run IDs, execution state, current step, errors, trace ID, findings or drafts, provenance, missing information, and next action.
- Mark API and model failures explicitly, preserve the item kind and pending status, support retry on the same thread, and never send third-party requests automatically.

## Capabilities

### New Capabilities

- `checklist-item-agents`: Classify, dispatch, observe, resume, and persist independent Agent work for checklist items.

### Modified Capabilities

- `job-management`: Extend checklist-item behavior to allow internal Agent processing while preserving binary item statuses, ownership checks, manual on-site completion, and independent notes.

## Impact

Touches `convex/agents/**`, Convex actions and internal mutations, the shared schema/contracts, Convex Storage form records, Agent skills, live API adapters, and Langfuse/OpenTelemetry configuration. Backend-owned persistence and generated bindings are dependencies; existing authentication and public manual checklist APIs remain compatible.
