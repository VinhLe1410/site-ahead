## ADDED Requirements

### Requirement: Optional category descriptions

Organization members SHALL be able to create, edit and clear an optional category description explaining which work belongs in that category. Descriptions SHALL be trimmed and limited to 2,000 characters. Categories without descriptions SHALL remain valid. Clearing a description SHALL preserve its title and checklist. Updating a category without supplying a description SHALL preserve its saved description. Existing organization access rules SHALL apply.

#### Scenario: Save and reopen a description

- **WHEN** a member saves a description for an existing category and reloads the editor
- **THEN** the saved description is shown and the category checklist is unchanged

#### Scenario: Clear a description

- **WHEN** a member saves an empty or whitespace-only description
- **THEN** the description is cleared and the category remains usable

#### Scenario: Preserve descriptions for existing callers

- **WHEN** a category update does not supply a description
- **THEN** the existing description remains unchanged

#### Scenario: Reject excessive descriptions

- **WHEN** a description exceeds 2,000 characters after trimming
- **THEN** saving fails with an actionable error and the category remains unchanged
