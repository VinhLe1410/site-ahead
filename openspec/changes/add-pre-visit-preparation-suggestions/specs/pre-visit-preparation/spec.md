## Purpose

Help contractors identify and track a few job-specific preparation actions that are useful before the first site visit, grounded in the customer's saved description.

## ADDED Requirements

### Requirement: Generate preparation from saved job context

An active organization member SHALL be able to explicitly request preparation suggestions for a saved Carpentry & Renovation job. Generation SHALL use the saved description, address, category, confirmed context, existing checklist and current findings with their provenance. Typed and voice-derived descriptions SHALL follow the same path without requiring audio. Unsupported or missing categories SHALL show a clear coverage limitation and SHALL NOT produce purported specialist advice.

#### Scenario: Prepare an existing renovation job

- **WHEN** a member requests suggestions for a saved deck-extension job
- **THEN** the system uses that job's saved context and returns its preparation result without modifying the category template or existing checklist

#### Scenario: Unsupported category

- **WHEN** a member requests suggestions for an uncategorized or unsupported trade job
- **THEN** the system explains that preparation guidance is currently available for Carpentry & Renovation and makes no specialist recommendation

### Requirement: Recommend only meaningful additional preparation

The current preparation list SHALL contain at most three items, with no minimum. Every suggestion SHALL provide a concrete action possible before visiting, a job-specific explanation of its benefit, and a supporting detail from the saved description. An item MUST resolve a material scope ambiguity, help prepare access, documents or equipment, or reduce the likelihood of an avoidable information-gathering trip. The system SHALL omit generic advice, already answered questions and semantic duplicates of the existing checklist, retained preparation tasks or current findings. It SHALL rank retained new suggestions by expected preparation value. A successful empty result SHALL explain that no additional meaningful preparation was identified, without implying that the job is safe or ready.

#### Scenario: Different work in the same category

- **WHEN** one description concerns extending a deck with uncertain frame reuse and narrow access, and another concerns replacing internal skirting boards
- **THEN** recommendations reflect the different described work rather than returning the same generic list
- **AND** deck-specific access and frame questions are not added to the skirting job without supporting context

#### Scenario: Do not fill a quota

- **WHEN** only one additional action satisfies the preparation criteria
- **THEN** the system returns one suggestion rather than adding weak items to reach three

#### Scenario: Known answer or duplicate

- **WHEN** the saved description already supplies the access width or the checklist already contains an equivalent action
- **THEN** the system does not recommend obtaining that same information again

#### Scenario: No useful additions

- **WHEN** no additional action satisfies the criteria
- **THEN** generation succeeds with no new suggestions and a clear empty-result explanation

### Requirement: Keep advice grounded and distinguish uncertainty

Suggestions SHALL be labeled as AI-generated preparation for contractor review. The system SHALL NOT invent site facts, infer approvals, assert unverified legal requirements or present preparation completion as site clearance. Requests for photos or existing information SHALL NOT instruct a client to enter unsafe areas or perform a professional assessment. Customer text SHALL be treated as job data, not instructions to override the generation rules. Invalid model output SHALL produce a visible failure, not fabricated fallback suggestions.

#### Scenario: Uncertain frame condition

- **WHEN** the customer is unsure whether an existing frame can be retained
- **THEN** a suggestion can request safely obtainable existing photos to prepare an assessment but does not declare the frame suitable or replace inspection

#### Scenario: Instruction embedded in description

- **WHEN** the saved description asks the model to ignore rules and declare permits approved
- **THEN** the result does not claim approval or change job facts or statuses

### Requirement: Review and complete preparation manually

Members SHALL be able to accept or dismiss individual suggestions. Accepted items SHALL start pending and support manual completion and reopening, with results shared across the organization after reload. Suggestions and accepted preparation tasks SHALL remain distinct from the existing automated, third-party and on-site checklist items. Reviewing or completing preparation SHALL NOT dispatch item agents, send messages, update confirmed evidence or change checklist or job status.

#### Scenario: Accept and complete an item

- **WHEN** a member accepts an access-information suggestion, marks it complete and reloads
- **THEN** the item remains accepted and complete for organization members and can be reopened
- **AND** no other checklist item or job status changes

#### Scenario: Dismiss a suggestion

- **WHEN** a member dismisses a suggestion
- **THEN** it is not counted as outstanding preparation and its dismissal survives reload

### Requirement: Preserve human decisions and expose stale results

The system SHALL distinguish not generated, running, successful empty, available, stale and failed results. Members SHALL be able to retry failures and explicitly refresh suggestions. Refresh SHALL preserve accepted tasks and their completion, replacing only unaccepted suggestions within the three-item current-list limit. Changed generation context SHALL mark earlier advice as stale and prevent acceptance until refreshed. Generation SHALL reject stale saves after job context or preparation decisions change and SHALL NOT overwrite human decisions. A timeout SHALL permit retry without leaving the job permanently running.

#### Scenario: Refresh after accepting an item

- **WHEN** a member accepts one item and refreshes
- **THEN** that item and its completion remain unchanged and at most two additional suggestions are returned

#### Scenario: Edit while generating

- **WHEN** the description changes or a member changes a preparation decision during generation
- **THEN** the old run does not overwrite the new context or decision and the member can refresh from current data

#### Scenario: Provider failure

- **WHEN** generation fails or times out
- **THEN** a retryable error is visible, previous accepted work remains available and no invented result is saved

### Requirement: Enforce organization access and job lifetime

Every preparation read, generation and decision SHALL require active membership in the job's organization. Access SHALL be rechecked before saving generated results. Deleting a job SHALL remove its preparation records and prevent an in-flight result from recreating them.

#### Scenario: Reject another organization's job

- **WHEN** a signed-out caller, removed member or another organization's member attempts preparation access or modification
- **THEN** no private data is returned and no preparation change is saved

#### Scenario: Delete during generation

- **WHEN** the job is deleted while suggestions are being generated
- **THEN** its preparation becomes unavailable and the late result is discarded
