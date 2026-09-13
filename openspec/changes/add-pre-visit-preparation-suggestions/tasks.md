## 1. Preparation data and access

- [x] 1.1 Add bounded preparation contracts and the additive `jobPreparations` table; verify generated types and existing jobs without backfill through `npm run check`.
- [x] 1.2 Add canonical context/finding freshness, authenticated reads, direct completion/reopening/dismissal and job deletion cleanup; verify organization isolation, three-slot bounds and saved decisions without modifying checklist/job status.
- [x] 1.3 Add saved client-message editing and explicit regeneration from pending client questions with revision checks; verify internal/completed/dismissed tasks are omitted, edits persist and changed sources mark drafts stale.

## 2. Grounded recommendations

- [x] 2.1 Add versioned Carpentry & Renovation guidance and bounded structured-output validation; verify zero is allowed, exact excerpts and count/field bounds are enforced, known answers and duplicates are excluded, and unsupported categories do not claim coverage.
- [x] 2.2 Add automatic generation on supported job creation and explicit existing-job generation with atomic claims, scheduled expiry, membership/revision/fingerprint guards and one bounded model call per attempt (at most one initial retry for changing findings); verify provider failure preserves work, human decisions and deletion reject late saves, and timeout permits retry.
- [x] 2.3 Verify live outputs for deck extension, skirting replacement, known access, vague description and injected instructions; record observed usefulness, client-message relevance, fewer-than-three/empty results and remaining quality limitations.

## 3. Contractor workflow

- [x] 3.1 Compose `PreVisitPreparation` in the existing job page with direct checkoff/dismiss, source/rationale, generate/refresh and visible loading/empty/stale/unsupported/failure states; verify the main workflow, visible generation and empty/stale states in the agreed desktop browser, inspect unsupported/failure rendering and verify backend access/failure guards.
- [x] 3.2 Add editable saved client message with explicit regenerate and copy controls; verify edits/reload, stale indication, no sending or completion side effects, and omission of completed/dismissed/internal questions on regeneration.
- [x] 3.3 Verify saved typed descriptions need no audio, organization members share preparation state, and preparation actions leave existing checklist totals, evidence, agent dispatch and job status unchanged.

## 4. Integration and verification

- [x] 4.1 Update implementation-scope notes in `docs/Site-Ahead-Idea.md` and `docs/roadmap.md`; verify the separate preparation/message extension and original roadmap exclusions remain explicit.
- [x] 4.2 Regenerate bindings and validate the additive backend on the existing configured development deployment; verify no schema/function validation failures or deployment identity changes.
- [x] 4.3 Run `npm run check` and `npm run build`, then complete a browser demo covering automatic generation, contrasting inputs, empty results, completion/reload and editable messages; use integration checks for explicit refresh, stale saves, failure/expiry retry, access denial and deletion; record evidence before marking complete.

## 5. All-job preparation extension

- [x] 5.1 Remove category eligibility restrictions, generalize grounded guidance with conditional Carpentry examples and bump the prompt version. Verify automatic and explicit generation for Electrical, custom and uncategorized jobs while retaining existing access, freshness, grounding and human-decision protections.
- [x] 5.2 Keep main's UI, update scope notes, run npm run check and npm run build, deploy to the existing development backend and verify generation on the Electrical demo.

Verification evidence: [Pre-Visit Preparation Verification](../../../docs/Pre-Visit-Preparation-Verification.md) records live model observations, the desktop workflow, backend integration checks and their limits. Earlier completed tasks document initial Carpentry scope; section 5 extends it under subsequent user authorization.
