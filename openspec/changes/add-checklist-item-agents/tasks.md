## 1. Establish the shared Convex contract

- [ ] 1.1 Coordinate with the Backend owner to add validators and indexes for one per-item Agent-state record and the form catalog, while leaving `checklistItems.kind`, `checklistItems.status`, and `checklistItems.notes` compatible with their existing validators; verify `npx tsc --noEmit` and Convex schema validation pass.
- [ ] 1.2 Define typed internal operations to create or claim an item state, update current step, save structured output, mark waiting/finished/failed, and resume an existing thread; verify ownership is derived from the item’s job and stale run IDs cannot overwrite newer state.
- [ ] 1.3 Seed the initial PDF/DOCX form files and catalog entries with stable form keys, file types, Storage IDs, and versions; verify each catalog entry points to an existing Convex Storage file and the original file remains unchanged after a draft run.
- [ ] 1.4 Coordinate with Backend to persist an optional contractor-confirmed construction year and supplying member/time, and expose it through the item-associated job context; validate the year as an integer from 1800 through the current UTC year, enforce organization access, and verify absence does not change the full-checklist-record input contract or require a year for every job.

## 2. Classify and dispatch checklist items

- [ ] 2.1 Refactor the classifier boundary to accept server-provided full `checklistItems` records, filter to `pending` items, preserve `done` items, validate one result per item, and persist valid `kind` overrides; verify a mixed pending/done input produces no work for done items.
- [ ] 2.2 Implement classification failure handling that preserves the previous kind, records a failed state with reason and Langfuse trace ID, and schedules no item sub-agent; verify missing, duplicate, invalid, and model-error outputs through the existing classification verification command.
- [ ] 2.3 Implement the deterministic dispatcher that creates one persistent thread for each pending `automated` or `third_party` item, skips `on_site`, schedules eligible runs concurrently, and prevents duplicate threads or overlapping runs; verify a mixed checklist starts only the eligible items.
- [ ] 2.4 Implement same-thread retry and resume after a failed run or newly supplied contractor information; verify retry changes only the selected item’s state and preserves its prior thread context and other items’ outputs.

## 3. Add validated live automated tools

- [ ] 3.1 Complete the DataVic construction-year adapter against the CKAN `datastore_search` resource, including exact normalized-address matching, construction-year validation, and the `constructionYear < 1990` finding. After a successful lookup with no matching record or an absent year, use an available validated contractor-provided year from the server-derived job context; verify DataVic takes precedence, fallback saves manual provenance and the lookup outcome, and absence of both sources remains unresolved and pending. Reject unsuccessful CKAN responses and prevent API/validation failures from activating the fallback.
- [ ] 3.2 Keep the EPA AirWatch and Transport Victoria adapters behind separate Agent tools with bounded requests, strict response validators, source timestamps, and location selection; verify each live endpoint returns the typed result captured by the existing automated-check verification scripts.
- [ ] 3.3 Register item-specific tool descriptions and allowlists so the Evidence sub-agent selects only the matching construction-year, air-quality, or road-closure tool; verify a basic Agent run invokes the intended tool and rejects an unrelated item/tool pairing.
- [ ] 3.4 Persist a validated automated finding, including manual provenance when fallback is used, before changing `checklistItems.status` from `pending` to `done`; verify API, validation, and persistence errors leave the item pending and record a failed state even when a manual year exists. Verify a successful DataVic lookup with no usable year and no manual value records an explicit unresolved result.

## 4. Build form-specific Request skills

- [ ] 4.1 Add one runtime skill module per supported third-party form with a name, use description, PDF/DOCX filling instructions, trusted database sources, required fields, formatting rules, and no-invention/missing-value rules; verify the Request Agent selects the skill from the item’s trade and request type.
- [ ] 4.2 Add scoped database and form-storage tools that load the item-associated job/input/category, resolve the skill’s active catalog entry, and read the source PDF or DOCX without accepting arbitrary owner IDs or paths; verify the selected file and job values are logged without secrets.
- [ ] 4.3 Implement format-specific draft filling for supported PDF and DOCX templates, saving a new draft file with a new Storage ID and preserving the original; verify all available values appear in the draft and unsupported/non-fillable files fail explicitly.
- [ ] 4.4 Save the draft Storage ID, source form ID, structured missing fields, verified provenance, and next action in the item Agent state; leave the checklist item pending, stop in `waiting`, and verify no request is sent automatically.

## 5. Add observability and failure visibility

- [ ] 5.1 Enable `experimental_telemetry` on every classifier and item-agent generation/stream call and attach the resulting Langfuse trace ID to the item state; verify traces are reachable with the existing Langfuse smoke-test and agent verification commands.
- [ ] 5.2 Extend shared observability with structured stage logs for classification, dispatch, skill selection, database lookup, API call, form read/fill, persistence, and waiting; include item/thread/run/tool identifiers and redact provider secrets, authorization headers, and unnecessary document contents.
- [ ] 5.3 Ensure every model, tool, form, and persistence failure records `failed` or `waiting`, current step, actionable error, and trace ID; verify no run is reported as finished unless its required structured output and save mutation succeed.

## 6. Integrate and verify the Agent journey

- [ ] 6.1 Run the Carpentry & Renovation acceptance journey with construction year, Air Quality, and Road Closure as automated items, Asbestos as on-site, and the permit/occupancy items as third-party; verify valid kind updates, independent concurrent states, binary checklist statuses, and no Powerlines work.
- [ ] 6.2 Demonstrate a DataVic no-match item using an available valid manual year and saving its attribution before completion; demonstrate no manual year leaving the item automated and pending, an API failure remaining failed despite an available manual year and retrying on the same thread, and a third-party item producing a reviewable PDF or DOCX draft with missing fields. Verify other item runs continue independently.
- [ ] 6.3 Run `npm run verify:classification`, `npm run verify:langfuse`, `npm run build`, and `npm run check`; resolve TypeScript, lint, formatting, OpenSpec, and Convex deployment validation failures before handoff.
