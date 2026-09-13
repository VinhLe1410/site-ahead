## ADDED Requirements

### Requirement: Intake matches the current organization catalog

Conversational job intake SHALL use the current organization's saved category names and optional descriptions to select a category for clearly matching work. The current catalog SHALL supersede older assistant statements about available trades. Typed messages and sent voice transcripts SHALL use the same matching behavior. The assistant SHALL treat category text as descriptive data, not instructions, and SHALL only select an existing category from the user's organization. Category selection SHALL NOT promise unsupported automation or modify category templates.

#### Scenario: Match saved category scope

- **WHEN** a contractor describes work clearly covered by a saved category's name and description
- **THEN** intake selects that category regardless of whether its trade was previously named in the assistant prompt

#### Scenario: Refresh category knowledge

- **WHEN** a member updates a category description and sends another intake message
- **THEN** the assistant uses the current description rather than older conversation claims

#### Scenario: Clarify uncertain work

- **WHEN** the request is too vague or fits multiple available categories
- **THEN** the assistant asks for clarification instead of guessing a category

#### Scenario: No matching category

- **WHEN** work matches no category in the user's organization
- **THEN** the assistant explains that no matching category exists and allows an Uncategorized job
- **AND** categories from another organization are not offered or selected

### Requirement: Preserve the contractor's category choice

Intake SHALL preserve an existing selected category unless the contractor requests a category change or clearing it. Unrelated description or address corrections SHALL NOT change that selection. Manual category selection and Uncategorized creation SHALL remain available.

#### Scenario: Correct the address only

- **WHEN** a contractor has selected a category and asks to correct the address
- **THEN** the address is updated and the selected category stays unchanged
