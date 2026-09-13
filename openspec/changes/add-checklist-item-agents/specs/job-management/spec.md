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
