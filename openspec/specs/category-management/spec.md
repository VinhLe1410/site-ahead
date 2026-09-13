# category-management Specification

## Purpose

Let contractors maintain private trade categories and reusable checklist templates for manually creating jobs.

## Requirements

### Requirement: Private category management

An authenticated user SHALL be able to list, create, read, and edit their own categories. Each category SHALL have a title and a checklist template. Categories SHALL be private to their creator. Unauthenticated requests and attempts to access another user's category SHALL be rejected without exposing its contents.

#### Scenario: Create and reopen a category

- **WHEN** a user creates an Electrical Work category and later reloads its page
- **THEN** the category and its saved template remain available to that user

#### Scenario: Isolate categories between users

- **WHEN** a second user lists categories or directly attempts to read, edit, or use the first user's category
- **THEN** the first user's category is absent from the list and direct access is rejected

#### Scenario: Reject signed-out access

- **WHEN** a signed-out caller requests a category operation
- **THEN** the operation is rejected

### Requirement: Checklist template contents

A category's checklist SHALL be a JSON array whose entries contain a nonblank `title` and a `kind` of `automated`, `third_party`, or `on_site`. The owner SHALL be able to add, edit, and remove template entries. Templates SHALL contain definitions only, without job IDs, item IDs, statuses, notes, or template keys. An empty template SHALL be allowed while setting up a category.

#### Scenario: Define checks for a trade

- **WHEN** the owner saves an Electrical Work template with an automated classification check and an on-site safety switch check
- **THEN** both entries retain their titles and kinds when reopened

#### Scenario: Reject invalid template data

- **WHEN** a save contains a blank category title, blank item title, unsupported kind, or malformed template data
- **THEN** the save fails with an actionable error and the previously saved category remains unchanged

### Requirement: Template edits preserve existing job checklists

Editing a category's checklist SHALL affect jobs created afterward. Existing jobs SHALL keep their own checklist item titles, kinds, statuses, and notes.

#### Scenario: Change a template after creating a job

- **WHEN** the owner creates Job A, edits its category's checklist, and then creates Job B from that category
- **THEN** Job A retains its previous checklist and progress
- **AND** Job B receives the edited template with fresh progress
