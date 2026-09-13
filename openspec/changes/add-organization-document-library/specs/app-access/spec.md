## MODIFIED Requirements

### Requirement: Minimal application shell

The protected application SHALL provide Jobs, Categories, and Library navigation, the organization name, current account email and role, and logout. Only owners SHALL have Organization navigation. Members opening `/app` SHALL reach `/app/jobs`, preserving its query and fragment. Jobs SHALL provide a dashboard, creation, details, editing, and deletion; Categories SHALL provide a list, creation, editing, and deletion. All private data requests SHALL stay beneath the authentication guard, and organization data requests SHALL also require current membership. Input SHALL have no separate navigation entry or page. The application SHALL indicate the current location and provide navigation back to its parent pages. Library navigation SHALL be available to both owners and staff. Library screens SHALL provide document browsing, search, upload, details, editing, replacement, downloads, and archiving under the existing authentication and membership rules.

#### Scenario: Enter the app

- **WHEN** a member completes login without another destination
- **THEN** `/app` leads to the jobs dashboard with organization name, account email, role, logout, and Jobs, Categories, and Library navigation

#### Scenario: Preserve the app destination

- **WHEN** a member opens `/app?view=recent#top`
- **THEN** the application opens `/app/jobs?view=recent#top`

#### Scenario: Return to a protected resource

- **WHEN** a signed-out member opens a job or category URL with a query and fragment and completes Google login
- **THEN** the existing return-destination behavior preserves that URL and its query and fragment

#### Scenario: Navigate between areas

- **WHEN** a member moves between available sections and resource details
- **THEN** the current location and parent navigation match the active page and account controls remain available

#### Scenario: Owner navigation

- **WHEN** an owner enters the app
- **THEN** they can navigate to organization and staff management
- **AND** staff do not receive that navigation or gain access by loading its URL directly

#### Scenario: Staff use the library

- **WHEN** staff enter the application and open Library
- **THEN** they can browse and manage their organization's documents without gaining access to owner-only Organization management

#### Scenario: Open a library destination directly

- **WHEN** a signed-out member opens a library document URL with a query and fragment and completes login
- **THEN** the requested destination is preserved and the document is shown only if current membership permits access
