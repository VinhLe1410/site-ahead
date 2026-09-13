## 1. Preparation data and access

- [ ] 1.1 Coordinate shared-file edits with `add-checklist-item-agents` and `align-shared-ui-with-prototype`, then add preparation validators and the bounded `jobPreparations` table in `convex/schema.ts`; verify existing jobs require no backfill and generated types accept the new records.
- [ ] 1.2 Implement authenticated preparation reads, start/refresh claims, accept/dismiss and completion operations in `convex/jobPreparation.ts` using `convex/access.ts`; verify reload persistence, the three-slot limit, preservation of accepted tasks and rejection of another organization's job.
- [ ] 1.3 Add context fingerprints, revision/run guards, expiry recovery and preparation cleanup in `convex/jobs.ts`; verify edited context, human decisions, removed membership and deletion during a run prevent stale saves, and interrupted runs permit retry.

## 2. Grounded recommendations

- [ ] 2.1 Add the versioned Carpentry & Renovation guidance in `convex/agents/preparation/carpentryPreparationGuidance.ts`, including the value rubric and positive/negative examples; verify it explicitly permits zero suggestions and excludes duplicates, known answers and unsupported professional claims.
- [ ] 2.2 Implement `convex/agents/preparation/recommendPreparation.ts` as one bounded structured-output call with existing dependencies and server-owned context; verify output count, field bounds and supporting excerpts are validated, secrets stay server-side, and provider or validation errors preserve saved work.
- [ ] 2.3 Check live model behavior with a deck extension, internal skirting replacement, a description with the access answer already supplied, a vague description and an injected instruction; verify each returned item has a meaningful pre-visit benefit and source detail, without requiring exact wording or a fixed count. Record observed output and any remaining quality limitation.

## 3. Contractor workflow

- [ ] 3.1 Add `PreVisitPreparation` in `src/pages/jobs/components/pre-visit-preparation.tsx` and compose it in `job-page.tsx`; verify generate/refresh, explanation/source detail, accept/dismiss, complete/reopen and loading/empty/stale/unsupported/failure states in the agreed desktop browser.
- [ ] 3.2 Verify preparation actions leave existing checklist totals, confirmed evidence, agent dispatch and job status unchanged; confirm typed saved descriptions work with no audio and acceptance survives reload for another member of the same organization.

## 4. Integration and verification

- [ ] 4.1 Update implementation-scope notes in `docs/Site-Ahead-Idea.md` and `docs/roadmap.md` to reference this separate reviewed-suggestions feature; verify the original bounded intake approach and other roadmap exclusions remain explicit.
- [ ] 4.2 Regenerate bindings and validate the additive backend on the agreed existing Convex deployment, coordinating with teammates sharing it; verify no schema or function validation errors and no changes to deployment identity.
- [ ] 4.3 Run `npm run check` and complete a short browser demo against the specification: contrasting renovation descriptions, fewer-than-three and empty results, accepting/completing/reloading, stale refresh, failure retry, access denial and deletion. Record results and limitations before marking implementation complete.
