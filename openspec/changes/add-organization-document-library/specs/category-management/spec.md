## MODIFIED Requirements

### Requirement: Checklist template contents

A category's checklist SHALL be a JSON array whose entries contain a nonblank `title` and a `kind` of `automated`, `third_party`, or `on_site`. Any organization member SHALL be able to add, edit, and remove template entries. Templates SHALL contain definitions only, without job IDs, item IDs, statuses, notes, or template keys. An empty template SHALL be allowed while setting up a category. Each entry MAY also reference up to 10 distinct active documents from the same organization. References SHALL belong to individual checklist items. Members SHALL be able to select, download, remove, and replace these references while editing a template. Invalid or archived document selections SHALL be rejected without changing the saved template. Existing entries without document references SHALL remain valid.

#### Scenario: Define checks for a trade

- **WHEN** an organization member saves an Electrical Work template with an automated classification check and an on-site safety switch check
- **THEN** both entries retain their titles and kinds when reopened

#### Scenario: Reject invalid template data

- **WHEN** a save contains a blank category title, blank item title, unsupported kind, or malformed template data
- **THEN** the save fails with an actionable error and the previously saved category remains unchanged

#### Scenario: Attach documents to one checklist item

- **WHEN** a member selects a guidance document and a blank form for one template item and saves the category
- **THEN** that item retains both references after reload and other items receive no references unless selected separately

#### Scenario: Reject invalid document selections

- **WHEN** a template save includes a missing document, an archived document, a document from another organization, a duplicate reference on one item, or more than 10 documents on an item
- **THEN** the save fails with an actionable error and the previous template remains unchanged

#### Scenario: Existing templates need no document setup

- **WHEN** a member opens or saves a category created before the library existed
- **THEN** its checklist remains usable without document references

### Requirement: Template edits preserve existing job checklists

Editing a category's checklist SHALL affect jobs created afterward. Existing jobs SHALL keep their own checklist item titles, kinds, statuses, and notes. Existing jobs SHALL also retain their assigned document versions when a member adds, removes, or replaces template document references.

#### Scenario: Change a template after creating a job

- **WHEN** an organization member creates Job A, edits its category's checklist, and then creates Job B from that category
- **THEN** Job A retains its previous checklist and progress
- **AND** Job B receives the edited template with fresh progress

#### Scenario: Change a template document after creating a job

- **WHEN** Job A is created with a form reference, a member replaces that reference in the template with a different document, and Job B is created
- **THEN** Job A retains its assigned form version and Job B receives the current version of the newly selected document
