## Purpose

Let contractors create their own accounts, sign in, recover access, and keep their account data private.

## ADDED Requirements

### Requirement: Open account registration

The system SHALL allow anyone to register using Google or email/password without an invitation, organization, or administrator approval. Login and signup SHALL have separate screens. Both screens SHALL offer Google and email/password, with links between the screens.

#### Scenario: Register with a password

- **WHEN** a visitor submits a valid email and a password of at least eight characters on the signup screen
- **THEN** the system starts email verification and explains how to complete it
- **AND** the visitor cannot access the protected application until verification succeeds

#### Scenario: Reject invalid or duplicate password registration

- **WHEN** a visitor submits an invalid email, a password shorter than eight characters, or an existing password account
- **THEN** registration does not succeed and the screen shows an actionable error
- **AND** the existing account and password remain unchanged

### Requirement: Password login and email verification

The system SHALL authenticate existing password accounts using their email and password. It SHALL require proof of email ownership before granting access and SHALL support requesting a new verification code.

#### Scenario: Complete verification

- **WHEN** a user submits the valid, unused verification code sent to their email
- **THEN** the system verifies their email and starts an authenticated session

#### Scenario: Reject an invalid verification code

- **WHEN** a user submits an incorrect, expired, or already used code
- **THEN** the system grants no access and offers a retry or a new code

#### Scenario: Resume an unverified signup

- **WHEN** a user with an unverified password account submits the correct credentials on the login screen
- **THEN** the system resumes email verification without requiring another signup

#### Scenario: Sign in with an existing account

- **WHEN** a verified user submits the correct email and password
- **THEN** the system starts an authenticated session

#### Scenario: Reject incorrect credentials

- **WHEN** a visitor submits an unknown email or an incorrect password
- **THEN** the login screen shows the same invalid-credentials message and grants no access

### Requirement: Google authentication

The system SHALL use real Google authentication to create an account on first use and sign in on later visits. Google and password authentication SHALL resolve to the same user when both methods prove ownership of the same email. An unverified email match SHALL NOT grant access to an existing account.

#### Scenario: Register and return through Google

- **WHEN** a visitor completes Google authentication for the first time and later signs in with the same Google account
- **THEN** both visits resolve to the same Site Ahead user

#### Scenario: Use both login methods

- **WHEN** a user completes password email verification and Google authentication for the same verified email, in either order
- **THEN** both methods resolve to one Site Ahead user

#### Scenario: Cancel Google authentication

- **WHEN** a visitor cancels Google authentication or the provider returns an error
- **THEN** protected content remains inaccessible and the visitor can retry from the login screen

### Requirement: Password recovery

The system SHALL provide a public password recovery flow using a code sent to the account email. Recovery SHALL require a valid, unused code and a new password meeting the signup requirements.

#### Scenario: Reset a password

- **WHEN** a user requests recovery and submits the emailed code with a valid new password
- **THEN** the password changes and the user can access the application
- **AND** the old password no longer authenticates the account

#### Scenario: Reject an invalid recovery attempt

- **WHEN** a visitor submits an incorrect, expired, or already used reset code
- **THEN** the account password remains unchanged and the visitor can retry or request a new code

#### Scenario: Request recovery for an unknown email

- **WHEN** a visitor requests recovery for an email without a password account
- **THEN** the screen gives the same conditional confirmation as for an existing account
- **AND** the request does not create an account or grant access

### Requirement: Persistent sessions and logout

The system SHALL preserve a valid session across page reloads and browser restarts until expiry or logout. Logout SHALL end the current browser session and return the user to the public landing page. Expired sessions SHALL require authentication again.

#### Scenario: Reload a protected page

- **WHEN** a signed-in user reloads the page or reopens the browser with a valid session
- **THEN** the application restores the session without requesting credentials again

#### Scenario: Log out

- **WHEN** a signed-in user selects logout
- **THEN** the session ends and the public landing page appears
- **AND** browser back navigation and other tabs sharing that session cannot reveal protected content

### Requirement: Account data access

The backend SHALL derive account identity from the authenticated session. It SHALL reject unauthenticated application requests and return only the requesting user's profile. Authentication endpoints SHALL remain reachable without a session. Starter demo functions SHALL no longer be callable.

#### Scenario: Request the current account

- **WHEN** a signed-in user requests their profile
- **THEN** the backend returns that user's profile without accepting another user's identity as input

#### Scenario: Bypass the frontend

- **WHEN** a signed-out caller requests protected account data directly
- **THEN** the backend rejects the request without returning private data

#### Scenario: Switch users

- **WHEN** user A logs out and user B signs in in the same browser
- **THEN** only user B's profile appears and user A's profile is no longer displayed

### Requirement: Usable authentication screens

All authentication forms SHALL have visible labels, keyboard access, suitable password-manager fields, pending feedback, and readable errors. Pending submissions SHALL prevent duplicate submissions. Email delivery failures SHALL be visible and retryable. Passwords and codes SHALL NOT appear in URLs or application logs.

#### Scenario: Submit with a slow connection

- **WHEN** a user submits a form and the request is still pending
- **THEN** the form indicates progress and prevents another submission
- **AND** failure restores the controls with an error message

#### Scenario: Email delivery fails

- **WHEN** the email service rejects a verification or recovery delivery
- **THEN** the screen reports the failure and allows a retry without claiming delivery succeeded
