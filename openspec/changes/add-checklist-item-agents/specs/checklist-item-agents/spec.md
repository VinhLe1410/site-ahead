## Purpose

Give every pending checklist item an independently observable path to an automated finding or a third-party request draft, while keeping on-site work human-controlled and preserving the existing checklist status contract.

## ADDED Requirements

### Requirement: Accept and prepare checklist items

The Agent SHALL accept a server-provided collection of full `checklistItems` records containing each item's `_id`, `jobId`, `title`, `kind`, `status`, and `notes`; it SHALL NOT require a separate top-level job ID. The Agent SHALL process only items whose status is `pending`. Items whose status is `done` SHALL remain unchanged and SHALL NOT be reclassified or assigned a new sub-agent on a later run.

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

- **WHEN** an automated sub-agent selects its matching tool and receives a valid API response
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

Each pending item classified as `third_party` SHALL receive an independent sub-agent with a form-specific skill. The skill SHALL select the appropriate form for the trade and request type, load the active PDF or DOCX form from Convex Storage through its catalog entry, and obtain field values from the item's associated job records. It SHALL fill only verified values, save a new draft file without overwriting the original, and record the draft storage ID, provenance, missing fields, and next action. The sub-agent SHALL stop in a waiting state for contractor review and SHALL NOT send the request automatically.

#### Scenario: Save a completed request draft

- **WHEN** a third-party sub-agent finds the matching skill and form and all required values are available
- **THEN** it saves a filled draft file as a new stored file
- **AND** records the draft file ID and source form ID
- **AND** records a next action telling the contractor to review and submit it
- **AND** the checklist item remains `pending`

#### Scenario: Save a partial draft with missing information

- **WHEN** required job information is absent
- **THEN** the sub-agent leaves those fields blank
- **AND** saves the draft with a structured list of missing fields
- **AND** records the information needed as the next action
- **AND** it does not invent a value or send the request

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

Every eligible item SHALL have a separate Agent-state record containing its checklist item ID, persistent thread ID, latest run ID, execution state, current step, error when present, Langfuse trace ID, and structured output fields for finding or draft, provenance, missing information, and next action. Execution state SHALL distinguish at least `idle`, `running`, `waiting`, `finished`, and `failed`. Agent logs SHALL identify the item, stage, tool or skill used, and failure reason without exposing provider secrets. A run SHALL NOT be reported as successful when its required output was not validated and saved.

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
