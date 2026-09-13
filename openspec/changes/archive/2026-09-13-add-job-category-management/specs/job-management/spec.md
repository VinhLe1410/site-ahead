## Purpose

Let contractors create private jobs from saved input and category templates, then manage job status and checklist progress manually.

## ADDED Requirements

### Requirement: Manual job creation with saved input

An authenticated user SHALL be able to create a job by providing nonblank processed text, one nonblank address, and an optional category they own. A successful submission SHALL save the input, link one new job to that input, optionally link the category, and give the job that address. A job without a category SHALL remain available as unclassified work and start without checklist items. The user SHALL reach the new job after creation. Input SHALL have no separate management page. This flow SHALL work without chat, agents, voice, or address lookup services.

#### Scenario: Create a job for hand-testing

- **WHEN** a user submits processed text, a single address, and their Electrical Work category
- **THEN** a job and its associated input are saved and the job opens with the submitted text and address

#### Scenario: Create an unclassified job

- **WHEN** a user submits processed text and an address without selecting a category
- **THEN** the job opens as Uncategorized with no checklist items and remains available for manual status management

#### Scenario: Reject an invalid submission

- **WHEN** the text or address is blank, or a selected category is missing or belongs to another user
- **THEN** creation fails with an actionable error and no partial input, job, or checklist is saved

#### Scenario: Start without categories

- **WHEN** a user opens job creation without an available category
- **THEN** the user can submit the job as Uncategorized

### Requirement: Private job dashboard and details

The user SHALL be able to browse their saved jobs, see each job's address, category or Uncategorized label, and status, and open its details. Job details SHALL show the processed input, single job address, category or Uncategorized label, status, and checklist. Saved data SHALL remain available after reload. Empty, loading, missing-record, and failed-request states SHALL be distinguishable. The user SHALL be able to retry failed requests.

#### Scenario: Open a saved job

- **WHEN** a user selects a job from the dashboard or reloads its direct URL
- **THEN** the job's saved details and checklist are displayed

#### Scenario: No jobs exist

- **WHEN** a user with no jobs opens the dashboard
- **THEN** the dashboard explains that no jobs exist and provides access to job creation

### Requirement: Independent checklist items

A new job SHALL receive its own checklist items copied from the selected category's template. Each saved item SHALL have an ID, job reference, title, kind, status, and notes. Items SHALL begin Pending with empty notes. Titles and kinds SHALL come from the template. Updating an item SHALL affect only that job's item.

#### Scenario: Two jobs use the same category

- **WHEN** the user creates two jobs from the same category and updates one job's checklist
- **THEN** the other job's checklist and the category template remain unchanged

### Requirement: Manual job status

Job status SHALL be Pending, In Progress, or Done, with Pending as the initial value. The owner SHALL be able to change the status manually to any of these values. Checklist changes SHALL NOT change job status, and job status changes SHALL NOT change checklist items.

#### Scenario: Checklist completion does not complete a job

- **WHEN** the owner completes every checklist item on a Pending job
- **THEN** the job remains Pending until its owner changes its status

#### Scenario: Change and reopen job status

- **WHEN** the owner changes a job to Done and later changes it back to In Progress
- **THEN** the selected status is saved each time and checklist progress remains unchanged

### Requirement: Checklist checkboxes and notes

Every checklist item SHALL have only Pending and Done statuses, regardless of kind. The owner SHALL toggle these through a labeled checkbox, unchecked for Pending and checked for Done. This checkbox behavior is an explicit user requirement for a familiar checklist interaction. The owner SHALL be able to save and clear item notes independently of completion. Updating an item SHALL NOT run an agent or perform an external action.

#### Scenario: Check and uncheck an item

- **WHEN** the owner checks an item, reloads the job, and then unchecks the item
- **THEN** the item persists as Done after checking and Pending after unchecking

#### Scenario: Save notes without changing completion

- **WHEN** the owner saves or clears an item's notes
- **THEN** the notes persist and neither the item status nor job status changes

### Requirement: Enforce job ownership and valid updates

Job, input, and checklist access SHALL derive the owner from the authenticated session. Listing SHALL include only the caller's jobs. Direct reads and updates of another user's job, input, or checklist item SHALL be rejected. Unsupported job or item statuses SHALL be rejected without changing saved data.

#### Scenario: Reject access through another user's item ID

- **WHEN** a user directly requests a status or notes update using another user's checklist item ID
- **THEN** the request is rejected and the item remains unchanged

#### Scenario: Reject private job and input reads

- **WHEN** a signed-out caller or another user tries to read a job or its saved input
- **THEN** no private record contents are returned

#### Scenario: Reject an unsupported status

- **WHEN** a caller attempts to set a job or checklist item to an unsupported status
- **THEN** the update fails and the previous status remains saved
