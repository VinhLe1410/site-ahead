# user-auth Specification

## Purpose

Let contractors create accounts and access their private workspace using Google during the Site Ahead hackathon demo.

## Requirements

### Requirement: Google account creation and login

The system SHALL offer Google as its only login method. First successful Google authentication SHALL create an account without an invitation or admin approval. Later authentication with the same Google account SHALL reuse that user. The login screen SHALL explain that first login creates an account.

#### Scenario: First and returning login

- **WHEN** a visitor completes Google authentication for the first time and later signs in with the same Google account
- **THEN** both sessions resolve to the same Site Ahead user

#### Scenario: Retry a failed login

- **WHEN** Google authentication is cancelled or cannot complete
- **THEN** the visitor gains no protected access and can retry from the login screen

### Requirement: Usable login screen

The login screen SHALL provide one keyboard-accessible Google button, pending feedback, and an error when starting authentication fails. Pending requests SHALL prevent duplicate submissions.

#### Scenario: Start authentication

- **WHEN** a visitor activates Continue with Google
- **THEN** the button shows progress until navigation or failure
- **AND** failure restores the button with an error message

### Requirement: Persistent sessions and logout

The system SHALL restore valid sessions across reloads and browser restarts until expiry or logout. Logout SHALL end the current browser session and return to the public landing page. Expired sessions SHALL require authentication again.

#### Scenario: Restore a valid session

- **WHEN** a signed-in user reloads or reopens the browser with a valid session
- **THEN** they can access the protected application without another login

#### Scenario: Log out

- **WHEN** a user selects logout
- **THEN** the session ends and `/` appears
- **AND** back navigation and tabs sharing that session cannot reveal protected content

#### Scenario: Retry a failed logout

- **WHEN** logout cannot complete
- **THEN** the screen reports the failure and allows another attempt

### Requirement: Private account access

The backend SHALL derive identity from the authenticated session and return only the caller's profile. It SHALL reject unauthenticated application requests. Authentication endpoints SHALL remain reachable without a session. The starter demo functions SHALL no longer be callable.

#### Scenario: Read the current account

- **WHEN** an authenticated user requests their profile
- **THEN** the backend returns that user's profile without accepting another identity as input

#### Scenario: Bypass the frontend

- **WHEN** a signed-out caller directly requests private profile data
- **THEN** the backend rejects the request without returning private data

#### Scenario: Switch accounts

- **WHEN** user A logs out and user B signs in
- **THEN** only user B's profile appears
