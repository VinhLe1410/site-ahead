## MODIFIED Requirements

### Requirement: Minimal application shell

The protected application SHALL provide Jobs and Categories navigation, the organization name, current account email and role, and logout. Only owners SHALL have Organization navigation. Members opening `/app` SHALL reach `/app/jobs`, preserving its query and fragment. Jobs SHALL provide a dashboard, creation, details, editing, and deletion; Categories SHALL provide a list, creation, editing, and deletion. All private data requests SHALL stay beneath the authentication guard, and organization data requests SHALL also require current membership. Input SHALL have no separate navigation entry or page. The application SHALL indicate the current location and provide navigation back to its parent pages.

#### Scenario: Enter the app

- **WHEN** a member completes login without another destination
- **THEN** `/app` leads to the jobs dashboard with organization name, account email, role, logout, and Jobs and Categories navigation

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

## ADDED Requirements

### Requirement: Gate organization work behind onboarding

Authenticated users without membership SHALL reach organization creation or invitation acceptance before accessing organization work. Onboarding and invitation acceptance SHALL remain accessible without organization membership but SHALL require authentication. Unknown routes SHALL retain the existing authenticated not-found behavior. A valid requested destination SHALL survive login and onboarding, including its query and fragment, and SHALL remain subject to organization access checks.

#### Scenario: First login

- **WHEN** a new user without membership or pending invitations logs in normally
- **THEN** they see organization creation and no organization work is requested or displayed

#### Scenario: Invitation bypasses organization creation

- **WHEN** a new user follows an invitation link and completes Google login
- **THEN** they see invitation acceptance without being forced to create an organization

#### Scenario: Return after onboarding

- **WHEN** a user completes required onboarding after requesting a protected resource
- **THEN** the preserved destination opens only with the access their new membership permits

#### Scenario: Direct reload

- **WHEN** a user reloads organization creation, an invitation link, or organization management
- **THEN** the matching screen and authentication, membership, and owner rules apply
