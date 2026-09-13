## Why

Jobs and categories are currently private to their creator. Contractors need an organization where an owner and staff share that work, with access the owner can revoke immediately.

## What Changes

- Add organization creation after Google login. New users create an organization and become its owner; invited users join as staff without creating one.
- Keep one owner and multiple staff per organization, with one organization per user for the demo. Both roles have full CRUD access to shared jobs and categories.
- Add one owner-only Organization screen for renaming the organization, managing staff, and creating, copying, and revoking invitations. Owners share invitation links manually. No email is sent.
- Add an invitation acceptance screen tied to the invited Google email. Keep pending invitations visible during onboarding.
- Remove staff access as soon as removal is saved. Connected screens clear organization content when the membership update arrives. Existing Google sessions do not grant continued organization access.
- Show the organization name and current role in the sidebar. Keep Jobs and Categories navigation; show Organization only to the owner.
- **BREAKING**: Replace creator-only data access with organization membership checks. Start development from empty databases with required organization ownership.
- Complete missing job editing and job/category deletion. Block category deletion while jobs reference it; let members reassign jobs without resetting their checklists.
- Exclude email delivery, notifications, role changes, ownership transfer, organization switching, organization deletion, and custom permissions.

## Capabilities

### New Capabilities

- `organization-management`: Onboarding, membership, owner controls, manual invitations, and access revocation.

### Modified Capabilities

- `app-access`: Organization onboarding and membership gates, sidebar identity, and owner navigation.
- `job-management`: Shared organization jobs, editing, deletion, and membership enforcement.
- `category-management`: Shared organization categories and deletion rules.

## Impact

Changes affect the Convex schema, access helpers, domain functions, Google profile verification, React routing, app layout, and job/category pages. Reuse existing Convex Auth and UI dependencies. Google remains the only login method. Implementation uses a clean development reset and manual verification with owner, staff, and unrelated accounts. Design includes ASCII wireframes and a seven-day invitation expiry.
