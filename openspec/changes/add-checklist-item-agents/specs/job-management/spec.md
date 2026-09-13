## MODIFIED Requirements

### Requirement: Checklist checkboxes and notes

Every checklist item SHALL have only Pending and Done statuses, regardless of kind. Any active organization member SHALL toggle these through a labeled checkbox, unchecked for Pending and checked for Done. This checkbox behavior is an explicit user requirement for a familiar checklist interaction. Any active organization member SHALL be able to save and clear item notes independently of completion. Manual checkbox and note updates SHALL NOT run an Agent or perform an external action. Internal Agent processing MAY update an item's kind and, after its own validation rules, its binary status; it SHALL store Agent progress and results separately and SHALL NOT change the member’s notes.

#### Scenario: Check and uncheck an item

- **WHEN** an organization member checks an item, reloads the job, and then unchecks the item
- **THEN** the item persists as Done after checking and Pending after unchecking

#### Scenario: Save notes without changing completion

- **WHEN** an organization member saves or clears an item's notes
- **THEN** the notes persist and neither the item status nor job status changes

#### Scenario: Manual updates do not dispatch Agent work

- **WHEN** an organization member changes a checklist checkbox or saves notes
- **THEN** the requested manual update is saved
- **AND** no Agent run or external request is started by that manual update

#### Scenario: Agent result preserves notes

- **WHEN** an eligible item Agent saves a finding, draft, or failure state
- **THEN** the item's Agent state is updated and any permitted binary status change is applied
- **AND** the checklist item's existing notes remain unchanged

## ADDED Requirements

### Requirement: Useful saved road disruption details

The job page SHALL show individual saved road-disruption records with road/locality, event/impact, publisher status, published timing, description and source/update information. It SHALL render descriptions as text and distinguish restrictions from full closures. Long lists MAY show initial examples and an expandable remainder. Exact-road coverage and the absence-of-matches limitation SHALL remain visible.

#### Scenario: Multiple published restrictions

- **WHEN** a saved Road Closure finding contains multiple matching records
- **THEN** the contractor sees specific examples and can inspect every saved record rather than only a count
- **AND** the page does not infer an unverified detour or claim every restriction is a full closure

#### Scenario: No published matches

- **WHEN** the complete validated snapshot has zero matching records
- **THEN** the page reports no published matches without inventing examples or guaranteeing unrestricted access

### Requirement: Current Job Brief and suggested priorities

The Job Brief SHALL summarize saved checklist work and suggested next actions in priority order using current checklist and Agent states. It SHALL distinguish completed checks, prepared drafts awaiting human review, manual completion, unresolved work and failures. It SHALL retain the original processed input, reflect live updates and loading/running states, and avoid claiming stale outputs or drafted applications are completed approvals. Suggested ordering SHALL prioritize outstanding on-site assessment, unresolved or failed automated checks, request review/arrangements and relevant travel preparation. It SHALL NOT automatically change checklist or job statuses.

#### Scenario: Automated findings and unsigned drafts

- **WHEN** three automated checks have saved results, two requests have unsigned drafts and an on-site assessment remains pending
- **THEN** the brief summarizes the three findings and two prepared drafts while recommending the outstanding assessment and human request review
- **AND** it does not claim the site is safe, permits are granted or applications were submitted

#### Scenario: Running, failed or manually completed work

- **WHEN** an item is running, fails, lacks required information or is marked done manually
- **THEN** the brief describes that saved state accurately and offers the relevant next action for pending work
- **AND** any earlier output is not presented as proof of the current run succeeding

#### Scenario: Original input remains available

- **WHEN** the contractor opens the live Job Brief
- **THEN** the original processed input is still accessible under an Original job brief disclosure
