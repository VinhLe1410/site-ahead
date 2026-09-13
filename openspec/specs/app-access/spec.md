# app-access Specification

## Purpose

Provide a public introduction to Site Ahead while requiring Google authentication for account data and active organization membership for shared work.

## Requirements

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

Google login SHALL return to the requested protected path on the originating frontend, including its query and fragment. The shared preview backend SHALL accept only its configured frontend or exact preview origins registered by the build. Dev and production SHALL accept only their configured frontend. Missing, malformed, unregistered, protocol-relative, or public-page destinations SHALL resolve to `/app` on an accepted origin.

#### Scenario: Preserve the destination

- **WHEN** a visitor starts at `/app?view=recent#top` and completes Google login
- **THEN** they return to `/app?view=recent#top`

#### Scenario: Reject an unsafe destination

- **WHEN** the supplied destination points outside the app or back to a public page
- **THEN** successful login opens `/app` without following that destination

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

### Requirement: Direct loads and browser history

Defined pages SHALL work on direct loads and reloads through the configured host. Browser back and forward navigation SHALL preserve access rules. Static assets and Google callbacks SHALL continue to load.

#### Scenario: Reload a page

- **WHEN** a visitor reloads `/`, `/login`, or `/app`
- **THEN** the correct page and access rules apply without a hosting-level not-found error

### Requirement: Shared PR previews

Every Vercel PR preview SHALL use the same persistent preview backend with one Google callback. Each build SHALL register its exact deployment and branch URLs before building the frontend. Origin registrations SHALL preserve those from other builds. Preview builds SHALL NOT deploy to the production or local-development backend. Users and backend code are shared across previews; the latest preview backend deployment is used by all preview frontends.

#### Scenario: Open previews from two PRs

- **WHEN** two PR builds complete and a user starts Google login from either preview
- **THEN** both use the shared preview Google callback and return to the originating preview

#### Scenario: Reject an unrelated site

- **WHEN** a login request supplies an unregistered return origin, including another Vercel site
- **THEN** the shared backend does not return the login code to that origin

#### Scenario: Build production

- **WHEN** Vercel builds its production environment
- **THEN** it deploys to the backend selected by its production deploy key without registering preview origins or changing shared preview settings
