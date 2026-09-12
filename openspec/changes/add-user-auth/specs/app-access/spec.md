## Purpose

Provide a public introduction to Site Ahead while requiring Google authentication for the application and private account data.

## ADDED Requirements

### Requirement: Public landing and login pages

The system SHALL expose `/` and `/login` without a session. The landing page SHALL introduce Site Ahead for contractors and link to login, or to `/app` when signed in. It SHALL contain no private account or job data and SHALL describe unimplemented job features as planned. Authenticated visitors to `/login` SHALL proceed to their valid requested destination or `/app`.

#### Scenario: Open the landing page

- **WHEN** a signed-out visitor opens `/`
- **THEN** the page shows the introduction and a login link without redirecting

#### Scenario: Visit while signed in

- **WHEN** a signed-in user opens `/`
- **THEN** the public page stays available and offers a link to `/app`

#### Scenario: Open login while signed in

- **WHEN** an authenticated user opens `/login`
- **THEN** they proceed to their valid requested application path, or `/app`

### Requirement: Protect other application paths

Every other browser page path SHALL require authentication. Until the backend accepts the session, protected content and its data requests SHALL remain withheld. Unknown paths SHALL show a not-found page after authentication.

#### Scenario: Direct protected navigation

- **WHEN** a signed-out visitor opens `/app` or an unknown path directly
- **THEN** they reach `/login` with the intended destination preserved
- **AND** protected content is never displayed before authentication

#### Scenario: Resolve authentication

- **WHEN** a protected page is checking or refreshing its session
- **THEN** it shows a loading state until authentication is resolved

#### Scenario: Lose authentication

- **WHEN** the current session expires or is invalidated
- **THEN** private content disappears and the user returns to login

### Requirement: Return to a safe destination

Google login SHALL return to the requested local protected path, including its query and fragment. Missing, malformed, external, protocol-relative, or public-page destinations SHALL resolve to `/app`.

#### Scenario: Preserve the destination

- **WHEN** a visitor starts at `/app?view=recent#top` and completes Google login
- **THEN** they return to `/app?view=recent#top`

#### Scenario: Reject an unsafe destination

- **WHEN** the supplied destination points outside the app or back to a public page
- **THEN** successful login opens `/app` without following that destination

### Requirement: Minimal application shell

The protected `/app` page SHALL show the current account email and a logout control. Job creation, checklists, and reports are outside this change.

#### Scenario: Enter the app

- **WHEN** a visitor completes login without another destination
- **THEN** `/app` shows their account email and logout control

### Requirement: Direct loads and browser history

Defined pages SHALL work on direct loads and reloads through the configured host. Browser back and forward navigation SHALL preserve access rules. Static assets and Google callbacks SHALL continue to load.

#### Scenario: Reload a page

- **WHEN** a visitor reloads `/`, `/login`, or `/app`
- **THEN** the correct page and access rules apply without a hosting-level not-found error
