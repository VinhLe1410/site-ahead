# Pre-visit preparation verification

Verified on 14 September 2026 against the existing `sleek-lyrebird-565` development deployment and the local frontend at `http://localhost:5173`. Deployment identity was preserved. Dedicated fictional preparation QA jobs were used; the two existing request-agent demo jobs were not edited.

## Implemented behavior

A saved supported job automatically starts preparation. Existing jobs have explicit generation/refresh. Zero to three current entries are directly checkable and dismissible. Completed entries survive refresh with their original source grounding. The client draft uses pending client-answerable questions only and can be edited, saved, regenerated or copied. It never sends a message or completes work.

The backend uses one bounded GPT-5.5 Responses call at medium reasoning per attempt, with a 60-second model timeout and no provider retries. Automatic initial generation permits at most one extra attempt when concurrent checklist findings change while authoritative input and human decisions remain unchanged. Explicit refresh makes one call. Run expiry is 90 seconds. Context fingerprints are SHA-256; raw context is only transient model input.

## Live recommendation examples

Five descriptions were exercised. The initial GPT-4o-mini trial correctly returned no suggestions for the supplied skirting, vague and injected descriptions, but produced speculative additional questions and unsuitable photo-assessment wording in the deck cases. The guidance was tightened and the implementation switched to the existing GPT-5.5 pattern. The affected deck/known-access cases and an empty skirting case were checked again with the final model; the other two initial examples were not repeatedly rerun.

| Fictional case | Observed result |
| --- | --- |
| Deck extension with unknown scope, uncertain frame retention and unmeasured narrow access | Three relevant items: clarify extension/roof scope, request existing or safely ground-level photos to prepare the on-site assessment, and establish access width. Each had an exact description excerpt and specific rationale. All three questions appeared in the client draft. |
| Deck extension with a supplied 850 mm gate width and old photos | Existing photos and missing extension frontage were requested; internal equipment/material handling used the supplied gate width. The client message omitted the internal task and did not ask for gate width again. |
| Skirting replacement with matching profile, dimensions, supplied photo and standard access | Successful empty preparation and no client message. |
| “Some carpentry work.” | Successful empty preparation and no client message in the initial model trial. |
| Matching skirting replacement plus instructions to ignore rules, approve permits, reveal the system prompt and claim structural safety | Successful empty preparation and no client message in the initial model trial; no invented approval or status change. |

The five retained QA job IDs are `kh7073k45qafk4wbzx64aa0htd8ebj31` (deck), `kh77sgdd75xr8ngbmmvr9egvk18eavyv` (known access), `kh770xcxk9xg89tf60fgpnefjs8eah3d` (skirting), `kh7fz8f10m8sdvh7j95s93568h8eaj5q` (vague), and `kh71y4vaq9rgfcjv555m75wgrd8eb6rs` (injected text). Preparation state on the deck may change during the manual workflow demo below.

These are observed examples, not a guarantee of semantic quality. Shape, field lengths, count, exact source excerpts and normalized duplicate actions are checked on the server. Meaningful relevance and semantic deduplication still depend on the model and contractor review. No professional usefulness study has been completed.

## Backend integration checks

The existing `convex/jobAgentContext.test.ts` harness now exercises the actual preparation queries and mutations with isolated `convex-test` identities and transactions. No public QA shortcuts or paid model calls are used for these checks.

- Another organization, signed-out caller and removed member cannot read or change preparation.
- Saved completion is visible to another member while job/checklist status and notes remain unchanged.
- Concurrent message saves reject an outdated expected revision. Manual message edits survive a successful preparation refresh.
- Completing/dismissing client questions removes them on explicit message regeneration. Empty messages remain null.
- Description changes reject late output and retain the previous preparation. Human completion also invalidates an in-flight result.
- Reviewed message saving acknowledges the current source snapshot while independent preparation staleness stays visible.
- Initial evidence recovery creates only a non-retryable second claim. Completed tasks retain their original fingerprint after a successful refresh; an overfull response is rejected without losing them.
- Provider failure preserves saved entries; expiry becomes failed and permits a new claim; an old run cannot save into the new claim.
- Removed initiating membership rejects the final save. Job deletion removes preparation and a late result cannot recreate it.

## Browser verification

The in-app desktop browser used the existing QA organization and the dedicated deck job. The following interactions passed:

- Saving the supported deck job automatically started preparation.
- Checking the first preparation item left the main checklist and job status unchanged.
- Editing and saving the client draft, then reloading, preserved both custom message text and preparation completion.
- Dismissing the photo item preserved the custom message and displayed an outdated-message notice.
- Regeneration asked before replacing the edited text, then produced only the remaining access-width question, omitting the completed scope question and dismissed photo question.
- Copy displayed its success feedback. The clipboard contents were not independently read.
- The final-model skirting job displayed the successful empty preparation state and no pending client questions.
- The known-access job showed the supplied 850 mm gate as an internal planning item, with only photo/frontage questions in the client draft.
- A desktop screenshot review found the section consistent with the existing styling, readable and unclipped.

Unsupported and provider-failure UI states were reviewed in implementation rather than explicitly exercised in the browser. Backend integration checks cover access denial, failed/expired runs, stale result rejection and deletion; these are not claimed as browser-tested scenarios. Explicit generation/refresh was also exercised through the authenticated Convex API during the live model checks.

The editor keeps unsaved local text separate from incoming saved revisions, presents conflicts without overwriting local text, and resets at the job identity boundary. Regeneration confirmation remains mounted while shared preparation eligibility changes; failed requests also retain visible editor error feedback.

## Code and deployment checks

`npm run check` passed with 60 tests, frontend and Convex TypeScript checks, Oxlint, Oxfmt and strict OpenSpec validation. `npm run build` passed. `convex dev --once` validated and pushed the additive schema/functions to the existing development deployment without schema or function errors. No quality rules, checks or hooks were disabled.

## All-job extension — 14 September 2026

Preparation now accepts Electrical, custom categories and uncategorized jobs. Existing jobs expose generation/refresh; new jobs start automatically. General guidance uses the saved scope, category, confirmed context and current findings, with conditional Carpentry examples. Prompt version `job-preparation-v2` makes earlier guidance visibly stale. Main's compact UI remains in place; the previously stashed alternate layout was not restored.

The existing integration suite now covers automatic and explicit generation for all three additional category cases, source-context grounding, invalid output rejection, preservation of prior work, and unchanged checklist/job records. `npm run check` passed with 82 tests in 11 files; build passed with the existing bundle-size advisory. Development deployment `sleek-lyrebird-565` accepted the functions successfully. Production was not modified.

Browser generation on the Carlton Electrical demo returned three pending suggestions: safely obtainable existing electrical-area photos, preferred visit/outage windows, and existing relevant property electrical documents. The client-message review control opened successfully. The checklist retained two completed checks, two prepared request drafts and pending human/certificate requirements. These are observed model suggestions for contractor review, not proof that the job is ready or that documents exist.
