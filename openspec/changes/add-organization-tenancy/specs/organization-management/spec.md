## Purpose

Let contractors create an organization, invite staff through manually shared links, and control access to shared jobs and categories.

## ADDED Requirements

### Requirement: Organization onboarding

An authenticated user without organization membership SHALL create an organization with a nonblank name before accessing organization work, unless they accept an invitation. Creation SHALL make them the sole owner. A user SHALL belong to at most one organization, and an organization SHALL have exactly one owner and zero or more staff. Repeated or concurrent submissions SHALL NOT create extra organizations or memberships for the same user.

#### Scenario: Create the first organization

- **WHEN** a new user signs in with Google without an invitation and submits an organization name
- **THEN** the organization is created, they become its owner, and they reach its jobs

#### Scenario: Resume unfinished onboarding

- **WHEN** a user without membership reloads or signs in again
- **THEN** they resume onboarding without gaining organization data access

#### Scenario: Reject an empty name

- **WHEN** a user submits a blank organization name
- **THEN** creation fails with a useful error and creates no organization or membership

### Requirement: Owner manages the organization and staff

Only the owner SHALL rename the organization, view the member and invitation management area, invite staff, or remove staff. Members SHALL be identifiable by name when available, email, and role. Both roles SHALL have full CRUD access to organization jobs and categories. The system SHALL offer no role changes, ownership transfer, or owner removal.

#### Scenario: Rename the organization

- **WHEN** the owner saves a nonblank organization name
- **THEN** the new name appears for all members

#### Scenario: Staff attempt owner operations

- **WHEN** staff directly request organization management, renaming, invitation management, or member removal
- **THEN** the request is rejected without exposing management data or changing membership

#### Scenario: Protect the owner

- **WHEN** a caller attempts to remove or demote the owner
- **THEN** the operation is rejected and the organization retains its owner

### Requirement: Manually shared staff invitations

The owner SHALL create an invitation for a Google account email and copy its link to share manually. The system SHALL send no invitation email or notification. The owner SHALL be able to list pending invitations, copy their links again, and revoke them. Invitations SHALL expire after seven days and support renewal with a replacement link that invalidates the previous link. Invalid email addresses, existing members, and duplicate pending invitations within the organization SHALL be rejected with useful errors.

#### Scenario: Create and share an invitation

- **WHEN** the owner creates an invitation for an eligible email
- **THEN** it appears among pending invitations with its expiry and a copyable link
- **AND** the interface states that the owner must share it and no email was sent

#### Scenario: Revoke an invitation

- **WHEN** the owner revokes a pending invitation
- **THEN** its link can no longer create membership

#### Scenario: Renew an expired invitation

- **WHEN** the owner renews an expired invitation
- **THEN** a new link is available for seven days and the previous link remains invalid

#### Scenario: Reject duplicate invitations

- **WHEN** the owner invites an existing member or an email with a pending invitation in that organization
- **THEN** creation is rejected without adding another invitation

### Requirement: Accept invitations with Google identity

An invitation SHALL grant staff membership only after explicit acceptance by a signed-in user whose verified Google email matches its recipient. Login SHALL preserve the invitation destination. Acceptance SHALL join the inviting organization without creating another organization. Users without membership who sign in normally SHALL see their pending invitations before creating an organization and SHALL be able to accept or decline them. Email domains alone SHALL NOT grant membership.

#### Scenario: New staff join through a link

- **WHEN** the invited user follows a valid link, signs in with the matching Google account, and accepts
- **THEN** they become staff, reach the organization's jobs, and appear in its member list instead of pending invitations

#### Scenario: Sign in without following the link

- **WHEN** a user without membership signs in normally with a matching pending invitation
- **THEN** onboarding offers that invitation before organization creation

#### Scenario: Wrong Google account

- **WHEN** a user opens an invitation with a different or unverified email
- **THEN** acceptance is blocked and they can use a different Google account without losing the invitation destination

#### Scenario: Invalid invitation

- **WHEN** a user attempts to accept an unknown, expired, revoked, or declined invitation
- **THEN** membership is not granted and the page explains that the invitation is unavailable

#### Scenario: Already belongs to an organization

- **WHEN** a member attempts to join a different organization
- **THEN** acceptance is blocked with the one-organization limit explained and their existing membership remains unchanged

#### Scenario: Repeat acceptance

- **WHEN** the accepted recipient opens their already accepted invitation
- **THEN** they can enter that organization if still a member, without creating another membership
- **AND** the link cannot restore membership after removal

### Requirement: Revoke staff access immediately

Removing staff SHALL end their organization access when removal is saved. Every subsequent organization data operation SHALL check current membership and reject removed users, including those with valid Google sessions. Connected pages SHALL clear organization content and show an access-removed message when the membership update arrives, without requiring refresh. Removal SHALL preserve organization jobs, inputs, categories, and checklists. The removed user SHALL be able to create their own organization or accept a new invitation. Previously delivered data cannot be retracted from an offline browser.

#### Scenario: Remove active staff

- **WHEN** the owner confirms removal while staff have a job open
- **THEN** subsequent reads and changes are rejected and the connected staff page changes to an access-removed message
- **AND** the job and its checklist remain available to remaining members

#### Scenario: Save races with removal

- **WHEN** a staff edit races with removal
- **THEN** it succeeds only if committed before removal; it cannot commit using stale membership afterward

#### Scenario: Rejoin after removal

- **WHEN** removed staff try their old accepted link
- **THEN** access remains blocked until they accept a new valid invitation

### Requirement: Preserve existing private work

Existing jobs, inputs, categories, and checklist progress SHALL survive the move to organization ownership. Each user present at migration SHALL become owner of a separate organization containing any existing private records. Data from unrelated users SHALL NOT be combined. Any account still without an organization SHALL be prompted to create one at its next login, unless it accepts an invitation.

#### Scenario: Existing creators return

- **WHEN** two existing creators with private work sign in after migration
- **THEN** each can access their previous work in their own organization and neither gains access to the other's work

#### Scenario: Existing account without saved work

- **WHEN** an existing user with no jobs or categories is migrated
- **THEN** they become owner of an empty organization

#### Scenario: Account without an organization after rollout

- **WHEN** an account without an organization signs in after rollout
- **THEN** it reaches organization creation or invitation acceptance before accessing organization work
