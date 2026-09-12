## Why

Site Ahead needs accounts and private application routes for the hackathon demo. Google login provides this without password forms, verification emails, or an email delivery service.

## What Changes

- Use Google as the only authentication provider. First login creates an account; later logins reuse it. No invitations or admin approval.
- Keep a public landing page at `/` and one login screen at `/login`.
- Protect every other application path. Restore valid sessions, preserve local return destinations, and provide logout.
- Show the current account in a minimal `/app` shell. Enforce account access in Convex and remove the starter demo API exports while preserving existing data.
- Remove password signup/login, verification, recovery screens, Resend code, and email configuration requirements from the implementation and tasks.

This is a hackathon demo. Job features, organizations, admin roles, additional providers, and a full production-readiness program are outside this change. The existing Vercel and Convex URLs are sufficient for Google login.

## Capabilities

### New Capabilities

- `user-auth`: Google account creation, login, persistent sessions, logout, and current-user access.
- `app-access`: Public landing/login pages, protected application routes, and safe return navigation.

### Modified Capabilities

None. The project has no existing specs.

## Impact

Keep Convex Auth, Auth.js, React Router, and existing UI components. Update the auth backend, route guards, login screen, landing page, README, and environment declarations. Remove Resend and password-related application code. No application email service or custom domain is required. Hosting configuration and Google credentials must match each deployment before its login flow can be demonstrated.
