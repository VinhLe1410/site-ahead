## MODIFIED Requirements

### Requirement: Minimal application shell

The protected application SHALL provide Jobs and Categories navigation, the current account email, and logout. Opening `/app` SHALL lead to `/app/jobs`, preserving its query and fragment. Jobs SHALL provide a dashboard, creation, and details; Categories SHALL provide a list, creation, and editing. All private data requests SHALL stay beneath the existing authentication guard. Input SHALL have no separate navigation entry or page. The application SHALL indicate the current location and provide navigation back to its parent pages.

#### Scenario: Enter the app

- **WHEN** a visitor completes login without another destination
- **THEN** `/app` leads to the jobs dashboard with account email, logout, and Jobs and Categories navigation available

#### Scenario: Preserve the app destination

- **WHEN** an authenticated user opens `/app?view=recent#top`
- **THEN** the application opens `/app/jobs?view=recent#top`

#### Scenario: Return to a protected resource

- **WHEN** a signed-out user opens a job or category URL with a query and fragment and completes Google login
- **THEN** the existing return-destination behavior preserves that URL and its query and fragment

#### Scenario: Navigate between areas

- **WHEN** the user moves between Jobs, Categories, and a resource's details
- **THEN** the current location and parent navigation match the active page, and account controls remain available
