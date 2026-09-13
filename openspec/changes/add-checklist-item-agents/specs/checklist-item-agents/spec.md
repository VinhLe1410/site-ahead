## Purpose

Give every pending checklist item an independently observable path to an automated finding or a third-party request draft, while keeping on-site work human-controlled and preserving the existing checklist status contract.

## ADDED Requirements

### Requirement: Accept and prepare checklist items

The Agent SHALL accept a server-provided collection of full `checklistItems` records containing each item's `_id`, `_creationTime`, `jobId`, `title`, `kind`, `status`, `notes`, and optional `documentVersionIds`; it SHALL NOT require a separate top-level job ID. After job creation saves its checklist, the system SHALL automatically schedule classification from those full server-derived records. Explicit start controls SHALL support existing saved checklists. The Agent SHALL process only items whose status is `pending`. Items whose status is `done` SHALL remain unchanged and SHALL NOT be reclassified or assigned a new sub-agent on a later run.

#### Scenario: Start work from saved checklist records

- **WHEN** the Agent receives pending and done `checklistItems` records
- **THEN** it considers only the pending records for classification and execution
- **AND** it leaves every done record unchanged

#### Scenario: Reject an unusable checklist input

- **WHEN** a supplied record is missing a required identity, title, kind, or supported status
- **THEN** the preparation run fails with an actionable reason
- **AND** it does not create sub-agent work from the invalid record

### Requirement: Classify pending items safely

Each pending item SHALL be classified as exactly one of `automated`, `third_party`, or `on_site`. A valid classification SHALL update that item's stored `kind`. If the model output is missing, duplicated, invalid, or cannot be parsed, the Agent SHALL preserve the existing `kind`, record a failed Agent state with the reason and trace ID, and SHALL NOT create an item sub-agent until a retry succeeds.

#### Scenario: Apply a valid classification

- **WHEN** the classifier returns one valid category for each pending item
- **THEN** each item's stored `kind` is updated to the returned category
- **AND** the next execution decision uses the updated category

#### Scenario: Preserve kind after classification failure

- **WHEN** the classifier omits an item or returns an unsupported category
- **THEN** that item's previous `kind` remains saved
- **AND** its Agent state is `failed` with a reason and trace ID
- **AND** no sub-agent is created for that item

### Requirement: Resolve automated items with live evidence

Each pending item classified as `automated` SHALL receive an independent sub-agent with only the tools appropriate to its item. The available live checks SHALL include construction year through the DataVic building-information API, air quality through EPA AirWatch, and road closures through Transport Victoria. Each successful check SHALL save a validated finding and its source or provenance before changing the checklist item's status from `pending` to `done`.

Construction-year resolution SHALL try DataVic first. If a successful lookup returns no matching record or a matching record with no construction year, the Agent SHALL use an available, validated contractor-provided year loaded from the same job's saved context. A valid DataVic year SHALL take precedence over the manual value. A manual finding SHALL identify its source as contractor-provided and retain the value's attribution and the DataVic lookup outcome; it SHALL NOT be labeled API-verified. With neither source available, the item SHALL remain unresolved and pending with an explicit reason. The Agent SHALL NOT guess a year or extract an unconfirmed year from free-text notes as a fallback. A live API or validation failure SHALL leave the item pending and record a failed Agent state even when a manual value is available; it SHALL NOT be hidden by the fallback.

#### Scenario: Complete an automated check

- **WHEN** an automated sub-agent selects its matching tool and receives a valid response relevant to the saved job location
- **THEN** the validated finding and provenance are saved for that checklist item
- **AND** the checklist item status changes from `pending` to `done`
- **AND** the sub-agent records a finished execution state

#### Scenario: Prefer a valid DataVic year

- **WHEN** DataVic returns a validated construction year and the job also has a contractor-provided year
- **THEN** the Agent uses the DataVic year and records the API provenance
- **AND** the manual value does not override it

#### Scenario: Use an available manual construction year

- **WHEN** a successful DataVic lookup finds no matching building or the matching record has no construction year
- **AND** the same job has a validated contractor-provided construction year of 1985
- **THEN** the Agent saves the year and the before-1990 finding with manual provenance and the DataVic lookup outcome
- **AND** it changes the item from `pending` to `done` only after that finding is saved

#### Scenario: Neither construction-year source is available

- **WHEN** a successful DataVic lookup finds no usable construction year and the job has no contractor-provided year
- **THEN** the item remains `automated` and `pending`
- **AND** the Agent state records an unresolved reason and the attempted source
- **AND** no construction year is inferred

#### Scenario: Reject an invalid manual year

- **WHEN** DataVic finds no usable year and the fallback value fails construction-year validation
- **THEN** the Agent leaves the item `automated` and `pending` and records a failed state with an actionable validation error
- **AND** it does not use the invalid value or report a completed finding

#### Scenario: Live API failure

- **WHEN** an automated API times out, returns an invalid response, or cannot be reached
- **THEN** the item remains `pending`
- **AND** the Agent state becomes `failed` with the current step, error, and trace ID
- **AND** an available manual construction year does not hide the API failure
- **AND** the contractor can retry the same item's sub-agent

### Requirement: Draft third-party requests from stored forms

Each pending item classified as `third_party` SHALL receive an independent sub-agent. This PoC SHALL provide exactly two form-specific skills, for Building Permit — Carpentry (PDF) and Occupancy Permit — Carpentry (DOCX). The skill SHALL select a compatible source from the item's pinned immutable organization document versions and obtain the actual address and available confirmed values from the saved job. For missing general fields, it MAY use the approved consistent fictional demo profile, explicitly identified as demo data. It SHALL leave signatures, signing dates, declarations, approvals, certificate references and unverified attachment claims for human confirmation. It SHALL save a new clearly labeled demo draft without overwriting the original and record storage ID, field provenance, missing information and next action. The sub-agent SHALL stop in `waiting`, leave the checklist `pending`, and SHALL NOT send the request automatically. Other form types SHALL fail or wait explicitly without a fabricated replacement.

#### Scenario: Save a completed request draft

- **WHEN** a third-party sub-agent finds the matching skill and form and all required values are available
- **THEN** it saves a filled draft file as a new stored file
- **AND** records the draft file ID and source document version ID
- **AND** records a next action telling the contractor to review and submit it
- **AND** the checklist item remains `pending`

#### Scenario: Save a partial draft with missing information

- **WHEN** a field lacks a saved value and an approved general demo default, or requires human confirmation
- **THEN** the sub-agent leaves that field blank or unchecked
- **AND** saves the draft with a structured list of missing fields
- **AND** records the information needed as the next action
- **AND** it does not invent an unapproved value or send the request

#### Scenario: Fill consistent demo details while preserving the job address

- **WHEN** the saved job has an address but no applicant or contractor contact details
- **THEN** both supported drafts use that saved address and the same approved fictional profile for available general defaults
- **AND** those defaults are identified as demo data in the draft and saved provenance
- **AND** a confirmed saved value takes precedence over its demo default
- **AND** no demo value is written back as a confirmed job fact or used as live automated evidence

#### Scenario: Preserve human confirmation fields

- **WHEN** a supported draft is generated or regenerated
- **THEN** applicant signatures and signing dates remain blank
- **AND** editable declarations, approvals, certificate references and attachment claims remain blank or unchecked and are listed for human attention
- **AND** any preprinted assertion in the original form is preserved and explicitly identified as unverified for human review
- **AND** the original form identity and scope remain visible

#### Scenario: No matching form skill or file

- **WHEN** no active form skill or stored form matches the request type
- **THEN** the item remains `third_party` and `pending`
- **AND** the Agent state becomes `failed` or `waiting` with an actionable reason
- **AND** no empty or misleading draft is saved

### Requirement: Run eligible items independently

After successful classification, the system SHALL create one persistent Agent thread for each pending `automated` or `third_party` item and schedule their runs concurrently. It SHALL create no Agent thread for an `on_site` item. It SHALL prevent duplicate thread creation and overlapping runs for the same item. A retry or newly supplied information SHALL resume the same item's thread and SHALL NOT restart or alter other items.

#### Scenario: Dispatch a mixed checklist

- **WHEN** a checklist contains automated, third-party, and on-site pending items
- **THEN** automated and third-party items each receive one independent sub-agent
- **AND** on-site items receive no sub-agent
- **AND** one item's waiting or failure state does not block other items from progressing

#### Scenario: Resume one waiting item

- **WHEN** the contractor supplies missing information or retries a failed item
- **THEN** only that item's existing Agent thread is resumed
- **AND** its prior context is retained
- **AND** other item threads and saved outputs remain unchanged

### Requirement: Persist progress and expose failures

Every eligible item SHALL have a separate Agent-state record containing its checklist item ID, optional persistent execution thread ID (absent before eligible classification), separate classification attempt, latest execution run ID, execution state, current step, error when present, Langfuse trace ID, and structured output fields for finding or draft, provenance, missing information, and next action. Execution state SHALL distinguish at least `idle`, `running`, `waiting`, `finished`, and `failed`. Agent logs SHALL identify the item, stage, tool or skill used, and failure reason without exposing provider secrets. A run SHALL NOT be reported as successful when its required output was not validated and saved.

#### Scenario: Observe an in-progress item

- **WHEN** an item sub-agent starts a run and calls a tool
- **THEN** its Agent state shows the current step and `running` execution state
- **AND** the run has a trace ID that can be followed in Langfuse

#### Scenario: Preserve a failed run for diagnosis

- **WHEN** a tool, skill, model call, or output save fails
- **THEN** the item state records `failed`, the current step, error, and trace ID
- **AND** the checklist item remains pending
- **AND** the failure is visible to the caller instead of being silently swallowed

### Requirement: Keep checklist status and human actions separate

Automated items SHALL change checklist status to `done` only after a validated finding is saved. Third-party items SHALL remain `pending` while their draft is awaiting review, submission, or a reply. On-site items SHALL remain human-controlled and may change to `done` only through the contractor's existing manual action. Agent execution state and structured output SHALL NOT replace the checklist item's binary status.

#### Scenario: Draft completion does not complete a request

- **WHEN** a third-party sub-agent saves a valid draft and waits for contractor review
- **THEN** the draft is available with its next action
- **AND** the checklist item status remains `pending`

#### Scenario: Complete an on-site item manually

- **WHEN** the contractor marks an on-site check complete
- **THEN** its checklist status changes from `pending` to `done`
- **AND** no Agent thread is created or run for that item

### Requirement: Protect saved context and recover interrupted work

Claims SHALL atomically prevent duplicate state records, duplicate execution threads, and overlapping runs. Every effect and result save SHALL reject stale runs, deleted resources, lost organization access, and changed item or relevant job context. Human notes and completion changes SHALL be preserved. A crashed or expired run SHALL become visibly failed with a retry action, and retry SHALL reuse its thread. Classification retry SHALL remain separate from execution retry.

#### Scenario: Human edit races with an automated save

- **WHEN** a member edits the item or its job context while an Agent runs
- **THEN** the stale output does not overwrite the edited record or complete the item
- **AND** the user can start a new run from the saved context

#### Scenario: Interrupted run recovery

- **WHEN** an action stops without persisting its required result before the bounded run deadline
- **THEN** the state becomes failed with an actionable reason
- **AND** a retry reuses the existing thread without overlapping the old run's effects

### Requirement: Expose scoped contractor controls

Any active organization member SHALL be able to start saved-checklist processing, inspect independent progress and provenance, retry failed classification, resume one eligible item, supply validated missing job data, and download saved drafts for their organization's items. Removed members and other organizations SHALL receive no job results or draft contents. Manual notes and checkboxes SHALL NOT dispatch work.

#### Scenario: Reload and review a draft

- **WHEN** an organization member reloads an item with a saved draft
- **THEN** its execution state, missing information, provenance, and next action remain visible
- **AND** the member can download the draft through an authenticated item/job access check

#### Scenario: Preserve a pinned form source

- **WHEN** a library document gets a newer version after a job is created
- **THEN** the item's Request Agent continues using its pinned compatible source version
- **AND** it saves a new draft without overwriting either library version

#### Scenario: Reject unapproved model field values

- **WHEN** a model proposes a value absent from saved job records and the approved general demo profile
- **THEN** the filling tool leaves that field blank and records it as missing
- **AND** the draft remains clearly labeled as a demo draft
