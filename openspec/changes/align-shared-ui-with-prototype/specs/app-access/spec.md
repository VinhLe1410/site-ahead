## ADDED Requirements

### Requirement: Consistent and concise interface

Existing public and protected screens SHALL share the team's approved prototype palette, typography, and square controls. These visual constraints preserve the team's chosen identity. Working pages SHALL identify the current task and its actions without generic subtitles or decorative captions. Labels identifying data, error recovery, account identity, and explanations needed to understand action consequences SHALL remain available.

#### Scenario: Move between working screens

- **WHEN** a member moves between Jobs, Categories, Organization, and their forms or dialogs
- **THEN** controls and navigation retain consistent styling and each screen presents its task and actions without repeating an introduction to the page

#### Scenario: Make a consequential choice

- **WHEN** a user creates an account, changes a job category, saves a template, shares an invitation, or confirms deletion or staff removal
- **THEN** the relevant account creation, checklist preservation, future-job effect, manual sharing, or deletion consequence remains explained where the action occurs

#### Scenario: Use a keyboard

- **WHEN** a user operates existing desktop screens with a keyboard
- **THEN** text and controls remain readable, actions remain reachable, focused controls are visible, and dialogs retain their keyboard interactions

### Requirement: Honest landing illustration

The public landing page SHALL pair its introduction with an explicitly labelled example checklist. The example SHALL use fictional content and SHALL NOT display private organization data or imply that unimplemented automation, voice intake, or reports are available.

#### Scenario: View the example

- **WHEN** a visitor opens the landing page
- **THEN** they can recognize the checklist as an example, understand the current manual preparation workflow, and proceed to login or their app
