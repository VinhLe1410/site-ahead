## Purpose

Help contractors identify and track a few job-specific preparation actions that are useful before the first site visit, grounded in the customer's saved description.

## ADDED Requirements

### Requirement: Generate preparation from saved job context

The system SHALL automatically start preparation after an active organization member saves a new Carpentry & Renovation job. An active member SHALL also be able to explicitly generate or refresh preparation for an existing saved job. Generation SHALL use the saved description, address, category, confirmed context, existing checklist and current findings with their provenance. Typed and voice-derived descriptions SHALL follow the same path without requiring audio. Unsupported or missing categories SHALL show a clear coverage limitation and SHALL NOT produce purported specialist advice.

#### Scenario: Automatically prepare a new renovation job

- **WHEN** a member saves a new supported renovation job
- **THEN** preparation generation starts automatically after the job is saved and does not block use of the existing checklist

#### Scenario: Prepare an existing renovation job

- **WHEN** a member requests suggestions for a saved deck-extension job
- **THEN** the system uses that job's saved context and returns its preparation result without modifying the category template or existing checklist

#### Scenario: Unsupported category

- **WHEN** a member requests suggestions for an uncategorized or unsupported trade job
- **THEN** the system explains that preparation guidance is currently available for Carpentry & Renovation and makes no specialist recommendation

### Requirement: Recommend only meaningful additional preparation

The current preparation list SHALL contain at most three items, with no minimum. Every suggestion SHALL provide a concrete action possible before visiting, a job-specific explanation of its benefit, and a supporting detail from the saved description. An item MUST resolve a material scope ambiguity, help prepare access, documents or equipment, or reduce the likelihood of an avoidable information-gathering trip. The system SHALL omit generic advice, already answered questions and semantic duplicates of the existing checklist, retained completed preparation tasks or current findings. It SHALL rank retained new suggestions by expected preparation value. A successful empty result SHALL explain that no additional meaningful preparation was identified, without implying that the job is safe or ready.

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

### Requirement: Complete preparation directly

Members SHALL be able to directly complete, reopen or dismiss individual preparation items without accepting them first. New items SHALL start pending and results SHALL be shared across the organization after reload. Preparation SHALL remain separate from the automated, third-party and on-site checklist. Preparation actions SHALL NOT dispatch item agents, send messages, update confirmed evidence or change checklist or job status.

#### Scenario: Complete and reopen an item

- **WHEN** a member checks an access-information preparation item complete and reloads
- **THEN** it remains complete for organization members and can be reopened
- **AND** no acceptance step or other checklist/job change occurs

#### Scenario: Dismiss a suggestion

- **WHEN** a member dismisses an item
- **THEN** it is not outstanding preparation and the dismissal survives reload
- **AND** it is excluded from refresh suggestions while the source context remains unchanged

### Requirement: Draft an editable client message

Generation SHALL provide an editable saved client message containing only questions from pending preparation items that the client can answer. Internal contractor tasks SHALL NOT become client requests. If there are no relevant questions, no message SHALL be required. Members SHALL be able to save edits, explicitly regenerate from current questions and copy the draft for manual use outside Site Ahead. Drafting, editing, copying and regenerating SHALL NOT send messages or mark preparation complete.

#### Scenario: Draft from client-answerable questions

- **WHEN** preparation identifies an access-width question and an internal equipment-planning task
- **THEN** the client message asks about access width and omits the internal task

#### Scenario: Preserve a manually edited message

- **WHEN** a member saves an edited message and later refreshes preparation
- **THEN** the edited text survives refresh and reload
- **AND** changed source questions or context mark the message stale until reviewed or explicitly regenerated

#### Scenario: Regenerate after manual progress

- **WHEN** a member completes or dismisses a question and explicitly regenerates the message
- **THEN** the new draft omits completed and dismissed questions
- **AND** it does not change preparation completion or send anything

#### Scenario: No client questions

- **WHEN** there are no pending client-answerable preparation items
- **THEN** regeneration explains that no client message is needed and provides no fabricated questions

#### Scenario: Concurrent message editing

- **WHEN** a member tries to save against a message version changed by another member
- **THEN** the save is rejected visibly and the newer saved text remains intact

### Requirement: Preserve human decisions and expose stale results

The system SHALL distinguish not generated, running, successful empty, available, stale and failed results. Members SHALL be able to retry failures and explicitly refresh suggestions. Refresh SHALL preserve completed tasks and their original grounding, replacing pending suggestions within the three-item current-list limit. Changed source context SHALL mark earlier advice and messages stale. Generation SHALL reject outdated saves after job context or preparation decisions change. Failed refresh SHALL preserve previous work. A timeout SHALL permit retry without leaving the job permanently running. Manual completion of stale tasks SHALL remain available without implying their advice is current.

#### Scenario: Refresh after completing an item

- **WHEN** a member completes one item and refreshes
- **THEN** the completed item remains unchanged and at most two additional items are returned

#### Scenario: Edit while generating

- **WHEN** the description changes or a member changes a preparation decision during generation
- **THEN** the old run does not overwrite the new context or decision and the member can refresh from current data

#### Scenario: Provider failure

- **WHEN** generation fails or times out
- **THEN** a retryable error is visible, previous work remains available and no invented result is saved

### Requirement: Enforce organization access and job lifetime

Every preparation read, generation and decision SHALL require active membership in the job's organization. Access SHALL be rechecked before saving generated results. Deleting a job SHALL remove its preparation records and prevent an in-flight result from recreating them.

#### Scenario: Reject another organization's job

- **WHEN** a signed-out caller, removed member or another organization's member attempts preparation access or modification
- **THEN** no private data is returned and no preparation change is saved

#### Scenario: Delete during generation

- **WHEN** the job is deleted while suggestions are being generated
- **THEN** its preparation becomes unavailable and the late result is discarded
