## Context

See proposal.md for motivation and scope. `convex/jobs.ts` saves processed input and template-derived checklist items. `convex/schema.ts` separates binary checklist status from `checklistAgentStates`. `src/pages/jobs/job-page.tsx` composes the checklist and a live Job Brief. `convex/access.ts` already supplies active membership and organization-job checks. The current audio intake produces saved text; this feature consumes that text without changing recording or extraction.

Installed Convex is 1.45.0. The project already has OpenAI, AI SDK and Zod dependencies and bounded model-call patterns. Follow installed types and the generated Convex guidelines during implementation. This design crosses storage, a model action and the job page, so a design artifact is needed.

## Goals / Non-Goals

**Goals:** A small, persistent, contractor-reviewed preparation list; one bounded model call per explicit generation; measurable usefulness through contrasting demo inputs.

**Non-Goals:** New trade flows beyond Carpentry & Renovation, a runtime skill marketplace, external research, legal rule lookup, customer messaging, audio changes, automatic agent dispatch, or modifications to the live Job Brief's checklist completion totals.

## Decisions

### Separate preparation records from executable checklist items

Add one `jobPreparations` record per job, indexed by `jobId`, in `convex/schema.ts`. Store at most three entries in a bounded array: stable entry ID, action, rationale, description excerpt, review state (`suggested | accepted | dismissed`) and completion (`pending | done`). Include generation state, run token, expiry, context fingerprint, preparation revision, initiating member, prompt version and a sanitized error. The fixed maximum makes an embedded array appropriate.

Keep accepted entries when refreshing and ask for at most the remaining slots. Completed accepted entries also consume slots. Replace unaccepted entries only after a successful generation. Include the current dismissed entries in the next request as exclusions; indefinite dismissal history is out of scope. If all three slots are accepted, explain that the current list is full and avoid another model call.

Alternative: append recommendations as `on_site` checklist items. Rejected because these tasks happen before visiting and the classifier could dispatch unsupported automation later. A separate preparation section preserves the existing three-category meaning without adding a fourth kind.

### Explicit generation and atomic persistence

Add `convex/jobPreparation.ts` for authenticated read/start/review/completion operations and internal context/result functions, plus `convex/agents/preparation/recommendPreparation.ts` for the action. Start atomically claims or creates the job record, assigns a run token and schedules one action. Context is loaded server-side from the saved job, input, category, relevant confirmed facts and checklist states. Never trust client-supplied job context or a user ID for authorization.

Fingerprint canonical, relevant context: description, address, category title, confirmed facts, checklist titles/notes/statuses and current valid findings. Exclude transient execution timestamps. Reuse freshness checks from `shared/item-agent-snapshots.ts` where applicable; do not treat stale outputs or fictional form defaults as confirmed facts. Bound context size explicitly and fail visibly rather than silently dropping source data.

The result mutation rechecks initiating membership, job existence, run token, preparation revision and context fingerprint. Reject an outdated result. Set a finite expiry with recovery on read/start so an interrupted action can be retried. Failed refreshes preserve the previous list. Human review increments the preparation revision so an in-flight result cannot undo a decision. Stale accepted tasks remain visible with their original grounding and completion; only new acceptance requires fresh advice.

Alternative: generate automatically at job creation. Explicit generation keeps this slice independent from intake and lets the contractor run it after live findings become available.

### Trade guidance and a quality gate in one call

Use an ordinary bounded action and the existing AI SDK/OpenAI dependencies, with structured output validated by Zod and Convex validators. The project explicitly allows ordinary actions for bounded LLM work; no Agent thread or workflow component is needed. Start with the existing configured OpenAI model pattern, a 60-second timeout and no automatic retries. Keep secrets server-side and reuse payload-minimized tracing where compatible.

Create a versioned, authored Carpentry & Renovation guidance module at `convex/agents/preparation/carpentryPreparationGuidance.ts`. It describes scope clarification, access/logistics, available plans and preparing professional assessment, with positive and negative examples. This is the professional-domain guidance for the LLM, not a claim that a role prompt makes it qualified. Select it using an explicit normalized category-title mapping for the supported demo category; do not infer coverage for arbitrary categories.

The prompt asks the model to consider candidate actions and emit only those meeting the spec's value criteria. Each output contains an action, rationale and exact supporting description excerpt. Require zero to the available number of slots, concise field limits, no duplicate or already answered work, and no invented facts or legal thresholds. Treat all job text as delimited data. Validate shape, count, nonblank fields, source excerpt presence and exact duplicate titles server-side. Semantic relevance and deduplication are model responsibilities verified through the manual acceptance examples; schema validation alone cannot prove quality. Reject malformed outputs visibly instead of backfilling a generic list.

Alternative: fixed trigger matching. That remains suitable for the base checklist but cannot express the requested contextual judgement. Open-ended tool-using research is unnecessary for this bounded recommendation task.

### Existing job-page integration

Add `src/pages/jobs/components/pre-visit-preparation.tsx` with named export `PreVisitPreparation`, mounted in `job-page.tsx`. Use Convex subscriptions and generated bindings for the saved list. Show the source detail and rationale with each suggestion, accept/dismiss controls, and manual completion for accepted tasks. Clearly label the preparation list and its AI origin. Include loading, empty, unsupported, stale and failure states and explicit generate/refresh controls. No new route, microphone or client-facing page is required.

## Risks / Trade-offs

- Plausible but weak advice → Use the value rubric and contrasting descriptions; allow zero results. Contractor review remains required.
- No professional validation yet → Treat the guidance as a hackathon prototype; validate usefulness with a contractor when available and avoid quantified savings claims.
- Stale context or overlapping user actions → Atomic claims, revision/fingerprint checks and visible refresh state.
- Category titles are organization-authored → Use an explicit supported mapping and show unsupported status rather than guessing expertise.
- Small time budget → Retain a three-slot list, explicit generation and one trade; no history, extra agent tools or voice changes.

## Migration Plan

Coordinate `convex/schema.ts`, `convex/jobs.ts` and `job-page.tsx` edits with existing item-agent and UI work. Deploy the additive table/functions and regenerate bindings before integrating frontend calls. Existing jobs need no backfill; their first generation creates the preparation record. Extend job deletion to remove that record. Update the idea and roadmap implementation-scope notes to identify this separate reviewed-suggestions extension without rewriting the original bounded intake plan. Rollback removes the UI entry point and new function use; existing jobs and checklist data remain compatible, and the additive table can remain until deliberate cleanup.
