## Why

Category templates miss preparation needs specific to a customer's description. Contractors need a few justified actions that clarify scope or prepare access, documents and equipment before the first visit, without generic checklist filler.

## What Changes

- Add an explicit action on a saved job to recommend zero to three meaningful pre-visit preparation items from its description, category, known context and existing checklist findings.
- Each suggestion explains the action, its benefit before visiting and the description detail that triggered it. Omit already answered questions, duplicates and weak suggestions rather than filling a quota.
- Let organization members accept or dismiss suggestions and manually check off accepted preparation items. Persist the results with the job.
- Use trade-informed guidance, initially for the current Carpentry & Renovation demo. Unsupported categories explain the limitation rather than claiming specialist coverage.
- Keep preparation tasks separate from the three existing resolution categories and their agents. No new voice requirement, messaging, research tools, regulatory determinations or automatic completion.

This user-requested proposal extends the idea document's bounded trigger approach with reviewed LLM suggestions. It does not replace template generation or expand the existing item-agent change. Planning defaults are explicit generation, a three-item current list and Carpentry & Renovation coverage.

## Capabilities

### New Capabilities

- `pre-visit-preparation`: Generate grounded preparation suggestions, review them and track accepted tasks within an organization's saved job.

### Modified Capabilities

None. Existing checklist generation, statuses and agent dispatch remain unchanged.

## Impact

- Backend: additive preparation storage and typed operations in Convex, one bounded LLM action using existing dependencies, and job deletion cleanup.
- Frontend: a preparation section on the existing job page; no new route or intake requirement.
- Reuse saved checklist context from `add-checklist-item-agents`; coordinate shared schema and job-page edits with that change.
- Source: the research conversation and explicit request for this OpenSpec, `docs/Site-Ahead-Idea.md`, `docs/roadmap.md`, and the existing job-management and item-agent specs. No GitHub issue has been created.
