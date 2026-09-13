# category-management Specification

## Purpose

Let organization members maintain shared trade categories and reusable checklist templates for manually creating jobs.

## Requirements

### Requirement: Private category management

An authenticated user SHALL be able to list, create, read, edit, and delete their organization's categories subject to the category deletion rule. Each category SHALL have a title and a checklist template. Categories SHALL belong to the organization and be shared by its owner and all staff, regardless of who created them. Unauthenticated requests and attempts to access another organization's category SHALL be rejected without exposing its contents.

#### Scenario: Create and reopen a category

- **WHEN** a user creates an Electrical Work category and later reloads its page
- **THEN** the category and its saved template remain available to all members of that organization

#### Scenario: Isolate categories between users

- **WHEN** a user from a different organization lists categories or directly attempts to read, edit, delete, or use the first organization's category
- **THEN** the first organization's category is absent from the list and direct access is rejected

#### Scenario: Reject signed-out access

- **WHEN** a signed-out caller requests a category operation
- **THEN** the operation is rejected

### Requirement: Checklist template contents

A category's checklist SHALL be a JSON array whose entries contain a nonblank `title` and a `kind` of `automated`, `third_party`, or `on_site`. Any organization member SHALL be able to add, edit, and remove template entries. Templates SHALL contain definitions only, without job IDs, item IDs, statuses, notes, or template keys. An empty template SHALL be allowed while setting up a category.

#### Scenario: Define checks for a trade

- **WHEN** an organization member saves an Electrical Work template with an automated classification check and an on-site safety switch check
- **THEN** both entries retain their titles and kinds when reopened

#### Scenario: Reject invalid template data

- **WHEN** a save contains a blank category title, blank item title, unsupported kind, or malformed template data
- **THEN** the save fails with an actionable error and the previously saved category remains unchanged

### Requirement: Template edits preserve existing job checklists

Editing a category's checklist SHALL affect jobs created afterward. Existing jobs SHALL keep their own checklist item titles, kinds, statuses, and notes.

#### Scenario: Change a template after creating a job

- **WHEN** an organization member creates Job A, edits its category's checklist, and then creates Job B from that category
- **THEN** Job A retains its previous checklist and progress
- **AND** Job B receives the edited template with fresh progress

### Requirement: Category deletion preserves referenced jobs

Any organization member SHALL be able to delete an unused category after confirmation. Deletion SHALL be rejected while any job references the category, with an explanation that the jobs must first be reassigned or made Uncategorized. Rejection SHALL leave the category, jobs, and checklists unchanged.

#### Scenario: Delete an unused category

- **WHEN** staff confirm deletion of an organization category with no referencing jobs
- **THEN** the category disappears for every organization member and can no longer be used for job creation

#### Scenario: Block deletion of a used category

- **WHEN** a member tries to delete a category referenced by a job
- **THEN** deletion fails with instructions to reassign the job or make it Uncategorized first
- **AND** the category and job remain unchanged

#### Scenario: Reassign before deletion

- **WHEN** members reassign or clear the category on every referencing job and then confirm category deletion
- **THEN** deletion succeeds and those jobs retain their checklists and progress
