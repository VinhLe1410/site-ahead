## MODIFIED Requirements

### Requirement: Manual job creation with saved input

An authenticated organization member SHALL be able to create a job by providing nonblank processed text, one nonblank address, and an optional category from their organization. A successful submission SHALL save the input, link one new job to that input, optionally link the category, and give the job that address. A job without a category SHALL remain available as unclassified work and start without checklist items. The user SHALL reach the new job after creation. Input SHALL have no separate management page. This flow SHALL work without chat, agents, voice, or address lookup services. Every template document reference SHALL resolve to an active document in the same organization before creation succeeds. If any reference is archived, missing, or inaccessible, creation SHALL fail without saving an input, job, or checklist. The error SHALL identify the affected checklist item and, when accessible, the document, and direct members to repair the template.

#### Scenario: Create a job for hand-testing

- **WHEN** a user submits processed text, a single address, and their organization's Electrical Work category
- **THEN** a job and its associated input are saved and the job opens with the submitted text and address

#### Scenario: Create an unclassified job

- **WHEN** a user submits processed text and an address without selecting a category
- **THEN** the job opens as Uncategorized with no checklist items and remains available for manual status management

#### Scenario: Reject an invalid submission

- **WHEN** the text or address is blank, or a selected category is missing or belongs to another organization
- **THEN** creation fails with an actionable error and no partial input, job, or checklist is saved

#### Scenario: Start without categories

- **WHEN** a user opens job creation without an available category
- **THEN** the user can submit the job as Uncategorized

#### Scenario: Archived document blocks job creation

- **WHEN** a member creates a job from a category whose checklist still references an archived document
- **THEN** creation fails with instructions to remove or replace that reference in the category template
- **AND** no input, job, or checklist is saved

#### Scenario: Repair the template and retry

- **WHEN** a member removes or replaces all invalid document references and retries job creation
- **THEN** the job is created with the repaired checklist and its document versions

#### Scenario: Document changes during creation

- **WHEN** job creation overlaps a document replacement or archive
- **THEN** the job receives the current versions of active documents at successful creation, or creation fails without saving partial work

### Requirement: Independent checklist items

A new job SHALL receive its own checklist items copied from the selected category's template. Each saved item SHALL have an ID, job reference, title, kind, status, and notes. Items SHALL begin Pending with empty notes. Titles and kinds SHALL come from the template. Updating an item SHALL affect only that job's item. Each item SHALL receive references to the current versions of its template documents when the job is created. Members SHALL see each assigned document and version and be able to download it from the item. Assigned versions SHALL remain unchanged by later document replacement, archive, or category edits. Existing jobs without document references SHALL remain usable. Downloading a document SHALL NOT change item status, notes, or job status.

#### Scenario: Two jobs use the same category

- **WHEN** the user creates two jobs from the same category and updates one job's checklist
- **THEN** the other job's checklist and the category template remain unchanged

#### Scenario: Download the version assigned to an item

- **WHEN** a member opens a saved job after one of its library documents has been replaced or archived
- **THEN** the affected checklist item still identifies and downloads the version assigned at job creation

#### Scenario: Existing jobs have no retroactive attachments

- **WHEN** documents are added to a category after an existing job was created without document references
- **THEN** that job keeps its existing checklist without gaining document attachments

### Requirement: Edit shared job details

Any organization member SHALL be able to edit a job's nonblank processed text, single nonblank address, and optional category from the same organization. Changes SHALL update the saved job and input together. Changing or clearing the category SHALL preserve existing checklist items, statuses, notes, and assigned document versions; it SHALL NOT generate or replace a checklist. Invalid submissions SHALL leave all saved data unchanged.

#### Scenario: Staff edit another member's job

- **WHEN** staff change the address and processed text of a job created by the owner
- **THEN** every member sees the saved changes after reopening the job

#### Scenario: Reassign a job

- **WHEN** a member selects another organization category or makes a job Uncategorized
- **THEN** its category changes while its checklist, notes, progress, and assigned document versions remain unchanged

#### Scenario: Reject an invalid edit

- **WHEN** a member submits blank required text or a category from another organization
- **THEN** the edit is rejected without partially changing the job or input

### Requirement: Delete shared jobs

Any organization member SHALL be able to delete a job after confirmation. The job and its checklist items SHALL become unavailable to all members. Other jobs and the category template SHALL remain unchanged. Saved input SHALL be removed only when no remaining job uses it. Deleting a job SHALL NOT delete shared library documents or their file versions.

#### Scenario: Staff delete an owner's job

- **WHEN** staff confirm deletion of a job created by the owner
- **THEN** the job disappears from the organization's dashboard and its direct URL no longer returns its data
- **AND** its checklist is removed and other jobs and templates are unchanged

#### Scenario: Cancel deletion

- **WHEN** a member cancels the deletion confirmation
- **THEN** the job remains unchanged
