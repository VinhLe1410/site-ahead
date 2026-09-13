## MODIFIED Requirements

### Requirement: Manual job creation with saved input

An authenticated organization member SHALL be able to create a job by providing nonblank processed text, one nonblank address, and an optional category from their organization. A successful submission SHALL save the input, link one new job to that input, optionally link the category, and give the job that address. A job without a category SHALL remain available as unclassified work and start without checklist items. The user SHALL reach the new job after creation. Input SHALL have no separate management page. This flow SHALL work without chat, agents, voice, or address lookup services.

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

### Requirement: Private job dashboard and details

Every organization member SHALL be able to browse all saved jobs in their organization, regardless of creator, see each job's address, category or Uncategorized label, and status, and open its details. Job details SHALL show the processed input, single job address, category or Uncategorized label, status, and checklist. Saved data SHALL remain available after reload. Empty, loading, missing-record, and failed-request states SHALL be distinguishable. The user SHALL be able to retry failed requests.

#### Scenario: Open a saved job

- **WHEN** a user selects a job from the dashboard or reloads its direct URL
- **THEN** the job's saved details and checklist are displayed

#### Scenario: No jobs exist

- **WHEN** a member of an organization with no jobs opens the dashboard
- **THEN** the dashboard explains that no jobs exist and provides access to job creation

### Requirement: Independent checklist items

A new job SHALL receive its own checklist items copied from the selected category's template. Each saved item SHALL have an ID, job reference, title, kind, status, and notes. Items SHALL begin Pending with empty notes. Titles and kinds SHALL come from the template. Updating an item SHALL affect only that job's item.

#### Scenario: Two jobs use the same category

- **WHEN** the user creates two jobs from the same category and updates one job's checklist
- **THEN** the other job's checklist and the category template remain unchanged

### Requirement: Manual job status

Job status SHALL be Pending, In Progress, or Done, with Pending as the initial value. Any organization member SHALL be able to change the status manually to any of these values. Checklist changes SHALL NOT change job status, and job status changes SHALL NOT change checklist items.

#### Scenario: Checklist completion does not complete a job

- **WHEN** an organization member completes every checklist item on a Pending job
- **THEN** the job remains Pending until a member changes its status

#### Scenario: Change and reopen job status

- **WHEN** an organization member changes a job to Done and later changes it back to In Progress
- **THEN** the selected status is saved each time and checklist progress remains unchanged

### Requirement: Checklist checkboxes and notes

Every checklist item SHALL have only Pending and Done statuses, regardless of kind. Any organization member SHALL toggle these through a labeled checkbox, unchecked for Pending and checked for Done. This checkbox behavior is an explicit user requirement for a familiar checklist interaction. Any organization member SHALL be able to save and clear item notes independently of completion. Updating an item SHALL NOT run an agent or perform an external action.

#### Scenario: Check and uncheck an item

- **WHEN** an organization member checks an item, reloads the job, and then unchecks the item
- **THEN** the item persists as Done after checking and Pending after unchecking

#### Scenario: Save notes without changing completion

- **WHEN** an organization member saves or clears an item's notes
- **THEN** the notes persist and neither the item status nor job status changes

### Requirement: Enforce job ownership and valid updates

Job, input, and checklist access SHALL derive an organization member from the authenticated session. Listing SHALL include only the caller's organization's jobs. Direct reads and updates of another organization's job, input, or checklist item SHALL be rejected. Unsupported job or item statuses SHALL be rejected without changing saved data.

#### Scenario: Reject access through another user's item ID

- **WHEN** a user directly requests a status or notes update using another organization's checklist item ID
- **THEN** the request is rejected and the item remains unchanged

#### Scenario: Reject private job and input reads

- **WHEN** a signed-out caller, a removed member, or a user from another organization tries to read a job or its saved input
- **THEN** no private record contents are returned

#### Scenario: Reject an unsupported status

- **WHEN** a caller attempts to set a job or checklist item to an unsupported status
- **THEN** the update fails and the previous status remains saved

## ADDED Requirements

### Requirement: Edit shared job details

Any organization member SHALL be able to edit a job's nonblank processed text, single nonblank address, and optional category from the same organization. Changes SHALL update the saved job and input together. Changing or clearing the category SHALL preserve existing checklist items, statuses, and notes; it SHALL NOT generate or replace a checklist. Invalid submissions SHALL leave all saved data unchanged.

#### Scenario: Staff edit another member's job

- **WHEN** staff change the address and processed text of a job created by the owner
- **THEN** every member sees the saved changes after reopening the job

#### Scenario: Reassign a job

- **WHEN** a member selects another organization category or makes a job Uncategorized
- **THEN** its category changes while its checklist, notes, and progress remain unchanged

#### Scenario: Reject an invalid edit

- **WHEN** a member submits blank required text or a category from another organization
- **THEN** the edit is rejected without partially changing the job or input

### Requirement: Delete shared jobs

Any organization member SHALL be able to delete a job after confirmation. The job and its checklist items SHALL become unavailable to all members. Other jobs and the category template SHALL remain unchanged. Saved input SHALL be removed only when no remaining job uses it.

#### Scenario: Staff delete an owner's job

- **WHEN** staff confirm deletion of a job created by the owner
- **THEN** the job disappears from the organization's dashboard and its direct URL no longer returns its data
- **AND** its checklist is removed and other jobs and templates are unchanged

#### Scenario: Cancel deletion

- **WHEN** a member cancels the deletion confirmation
- **THEN** the job remains unchanged
