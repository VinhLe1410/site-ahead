## Purpose

Give visitors a public introduction to Site Ahead while requiring authentication for the application and its private content.

## ADDED Requirements

### Requirement: Public landing page

The system SHALL serve a public page at `/` that introduces Site Ahead for contractors and links to login and signup. It SHALL be accessible while signed in or signed out and SHALL NOT display private account or job data. Descriptions of planned job features SHALL NOT claim those features already work.

#### Scenario: Visit without an account

- **WHEN** a signed-out visitor opens `/`
- **THEN** they see the product introduction and links to `/login` and `/signup` without an authentication redirect

#### Scenario: Return while signed in

- **WHEN** a signed-in user opens `/`
- **THEN** the landing page remains available and offers a link to `/app`

### Requirement: Public authentication routes

The system SHALL expose `/login`, `/signup`, `/verify-email`, and `/reset-password` without requiring a session. Verification and reset screens SHALL support entering the email and code after a reload without storing credentials in the URL. Signed-in visitors to authentication screens SHALL proceed to the protected application.

#### Scenario: Open recovery directly

- **WHEN** a signed-out visitor opens `/reset-password` directly
- **THEN** they can request a reset code or enter a code they already received

#### Scenario: Open verification directly

- **WHEN** a signed-out visitor opens `/verify-email` directly
- **THEN** they can enter their email and verification code or return to login to request a new code

#### Scenario: Open login while signed in

- **WHEN** an authenticated user opens `/login` or `/signup`
- **THEN** they proceed to their valid requested application path, or `/app` when none exists

### Requirement: Protect all other application paths

Every browser page path outside the public routes SHALL require authentication. While authentication is loading, protected content SHALL remain hidden and the page SHALL show a loading state. Unknown paths SHALL follow the same protection rule and show a not-found page only after authentication.

#### Scenario: Open a protected path while signed out

- **WHEN** a signed-out visitor opens `/app` directly
- **THEN** they are sent to `/login` with their intended destination preserved
- **AND** protected content is never displayed before authentication

#### Scenario: Restore a session

- **WHEN** a protected page is opened and the session is still being checked
- **THEN** the page shows a loading state without redirecting prematurely or displaying protected content

#### Scenario: Lose a session

- **WHEN** the current session expires or is invalidated while a protected page is open
- **THEN** protected content disappears and the user is sent to login

#### Scenario: Open an unknown path

- **WHEN** a signed-out visitor opens `/unknown`
- **THEN** they must authenticate before seeing a not-found page

### Requirement: Return to the requested path

Successful password login, verification, recovery, or Google authentication SHALL return users to the requested local protected path, including its query and fragment. Without a valid destination, the system SHALL use `/app`. Destinations outside this app or pointing to public authentication pages SHALL NOT be followed.

#### Scenario: Complete Google after a protected-page redirect

- **WHEN** a visitor starts at `/app?view=recent`, is redirected to login, and completes Google authentication
- **THEN** they return to `/app?view=recent`

#### Scenario: Reject an external destination

- **WHEN** a visitor supplies an external, protocol-relative, or otherwise invalid return destination
- **THEN** successful authentication opens `/app` without navigating to that destination

### Requirement: Minimal protected application shell

The system SHALL provide `/app` with the authenticated account email and a logout control. This change SHALL replace the starter numbers interface without introducing job, checklist, or report functionality.

#### Scenario: Enter the application

- **WHEN** a user completes authentication without another destination
- **THEN** `/app` shows their account email and logout control
- **AND** it does not show the starter numbers interface or controls for unimplemented job features

### Requirement: Direct navigation and reloads

Application URLs SHALL work when entered directly or reloaded on the configured host. Browser back and forward navigation SHALL preserve the access rules. Static assets and authentication provider callbacks SHALL continue to load.

#### Scenario: Reload on the hosted app

- **WHEN** a visitor directly opens or reloads `/login`, `/signup`, `/verify-email`, `/reset-password`, or `/app` on the configured host
- **THEN** the correct page and access rules apply without a hosting-level not-found error
