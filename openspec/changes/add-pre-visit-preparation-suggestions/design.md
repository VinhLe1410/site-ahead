## Context

See proposal.md for motivation and agreed scope. `convex/jobs.ts` saves processed input and template-derived checklist items. `convex/schema.ts` separates binary checklist status from agent state. The existing job page composes the checklist and live Job Brief. Reuse active membership and organization-job checks in `convex/access.ts`.

Installed Convex is 1.45.0. OpenAI, AI SDK and Zod are already installed. Follow installed types and generated Convex guidelines. Saved text from either intake path is sufficient; audio remains unchanged.

## Goals / Non-Goals

**Goals:** A small persistent preparation list, direct manual completion, and an editable copy-only client message. Keep provider execution bounded and preserve human changes during refresh.

**Non-Goals:** Additional automated trade checks or form skills, runtime skill marketplace, external research, legal lookup, sending messages, automatic completion, agent dispatch for preparation, or changes to checklist/Job Brief totals.

## Decisions

### Separate preparation from executable checklist items

Add one `jobPreparations` record per job, indexed by `jobId`. Store at most three current entries with stable IDs, action, rationale, exact description excerpt, optional client question, status (`pending | done | dismissed`) and original context fingerprint. Completed entries consume slots and remain on refresh; successful refresh replaces pending/dismissed entries within the remaining slots. Retain bounded dismissal exclusions for the same generation context; changed job context resets these exclusions. Fail visibly if that bound is reached rather than silently forgetting decisions.

Keep generation state, run token, deadline, context fingerprint, revision, initiating user and prompt version on the record. Keep the saved client message, message revision, source snapshot and whether a user edited it. A bounded embedded list fits this scope without adding a fourth executable checklist category or a separate history store.

Alternative: append `on_site` checklist items. Rejected because preparation happens before visiting and must not be classified or dispatched by existing agents.

### Automatic start with atomic run and freshness guards

After saving any new job, atomically claim its preparation record and schedule one ordinary action. Existing jobs expose explicit generate/refresh. Custom and missing categories use the same path. Context is loaded server-side from the saved description, address, category, confirmed fields, checklist and current findings with provenance. Bound source size and fail visibly rather than truncating silently.

Canonical SHA-256 context fingerprints keep source text transient and exclude execution timestamps and fictional form defaults. Include only valid current findings, using `executionSnapshot` with item status normalized to pending because successful automated saves use that snapshot before completion. Exclude busy, failed or stale agent output. Retain each completed task's original fingerprint so refresh never conceals stale grounding.

Result persistence rechecks job existence, initiating active membership, run token, deadline, preparation revision and context fingerprint. Human checkoff/dismiss changes invalidate an in-flight run. Failed refresh preserves saved work. Schedule a token-guarded expiry mutation; also recover expired claims on start. Queries derive freshness from reactive saved context, never from wall-clock reads or query writes. Initial checklist agents may change findings during the automatic preparation call. Permit one bounded automatic retry only if the authoritative description, address, category, confirmed fields, checklist titles/notes and preparation revision are unchanged. That retry reloads the newest findings; a second mismatch fails visibly with explicit refresh. Description, notes or confirmed-fact edits fail closed immediately. This limits initial generation to two calls and explicit refresh to one; there is no retry loop.

Alternative: automatic regeneration on every checklist change. Rejected to avoid repeated calls and unexpected replacement of pending tasks.

### One bounded generation call with trade guidance

Use `convex/agents/preparation/recommendPreparation.ts` and versioned `preparationGuidance.ts`. Ground general preparation in the saved scope for every category, retaining conditional Carpentry examples. Category names do not establish specialist requirements. Bump the prompt version to mark prior output stale. Use one structured-output AI SDK/OpenAI Responses call with the existing GPT-5.5 model pattern at medium reasoning, a 60-second timeout per call, no provider retries and existing payload-minimized tracing. Only the bounded initial-context recovery described above can schedule a second call. No Agent thread or workflow is required for this bounded call.

The value rubric permits zero suggestions and asks for concrete before-visit actions, job-specific rationale and exact supporting description excerpts. Omit generic advice, known answers and semantic duplicates. Each item also contains a concise client question or null when the action is internal. Validate count, field bounds, nonblank values, exact excerpt grounding and normalized duplicate actions server-side. Semantic quality remains a model responsibility verified with contrasting live examples. Do not fabricate a fallback list on failure.

### Persist an editable message without overwriting human work

Compose the initial draft deterministically from structured client questions in the same generation output. This avoids a second model call and prevents unrelated text in the client message. Include only pending, non-dismissed client-answerable items; no questions yields no draft. Never include internal preparation tasks.

An untouched generated message may update on successful preparation refresh. Once manually edited, preserve it and show it as stale if the list/context snapshot changes. Save edits with an expected message revision to reject concurrent overwrites. Explicit message regeneration replaces the draft from current fresh pending questions after a UI confirmation when edits would be lost. It excludes completed/dismissed items. Completion/reopening/dismissal and source changes mark the existing draft stale; they never silently rewrite a human draft. Copying does not send anything or complete work.

### Existing job-page integration

Add `PreVisitPreparation` beside the existing checklist and brief. Use generated Convex hooks for shared state. Render direct completion checkboxes, dismiss actions, rationale/source detail, generate/refresh and the editable message with save/regenerate/copy controls. Show loading, empty, unsupported, running, stale and failed states. Keep saved stale work readable and manual completion available; message regeneration requires fresh preparation questions.

## Risks / Trade-offs

- Weak but plausible suggestions → Author trade guidance and a usefulness rubric, allow zero, and record live examples without claiming professional validation.
- Job edits or concurrent actions → Canonical fingerprints, revisions, atomic claims and scheduled expiry protect saved decisions.
- A generated list may become stale as independent agents finish → One bounded initial retry, then visible manual refresh; no repeated regeneration loop.
- Organization-authored or missing categories → Ground preparation in saved scope rather than guessed expertise.
- A manually edited message can contain obsolete questions → Preserve it visibly as stale and offer explicit regeneration for contractor review.

## Migration Plan

The current checklist agents and UI are already integrated. One implementation agent owns shared schema/job/page edits in this change. Add the table without backfill, regenerate bindings and validate on the already configured existing development deployment. Never rebind the deployment or use production for QA. Delete preparation with its job. Update product scope notes without rewriting the bounded intake plan. Removing the feature entry points is sufficient rollback; existing job/checklist data stays compatible.
