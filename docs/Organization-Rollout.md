# Organization setup and verification

Development starts from empty databases after PR #12. New Google accounts create an organization or accept a matching invitation. No migration or activation step is required. Jobs, inputs, and categories require an organization ID.

## Reset scope

The developer authorized resetting these deployments, including application data, accounts, and sessions. Deployment URLs, signing keys, Google credentials, and other environment settings stay in place.

| Developer or use  | Deployment               |
| ----------------- | ------------------------ |
| Vinh              | `brainy-gopher-762`      |
| Andy Truong       | `wary-pigeon-450`        |
| Son Bui           | `sleek-lyrebird-565`     |
| Shared PR preview | `moonlit-roadrunner-502` |

The Convex project inventory contained these three personal development deployments and no registered local deployments. Production at `friendly-chipmunk-910` and the seven old PR preview deployments are outside this reset. All active PR previews share the latest backend code and data at `moonlit-roadrunner-502`.

## Verification

Completed on 2026-09-13:

- Exported snapshots of all four deployments, including file storage, outside the repository before deletion.
- Cleared application and auth records. Son's deployment also contained 9 agent threads and 18 agent messages; those were cleared before the cleaned backend unmounted the component.
- Deployed the cleaned backend to all four targets. Confirmed migration functions and maintenance states are absent.
- Verified new-owner onboarding, blank-name rejection, duplicate creation prevention, empty jobs/categories, staff invitation acceptance, repeated acceptance, and organization isolation on each deployment. These checks used temporary verified-user fixtures and admin identities. Invitation fixtures avoided scheduling test expiry jobs.
- Started Google sign-in on every deployment and confirmed the redirect to Google uses that deployment's callback. Completing Google login in a browser remains unverified.
- Removed verification data and confirmed all 15 application/auth tables, file storage, and scheduled functions are empty on each target.
- Confirmed production and the seven old preview deployment timestamps remain unchanged.
- Passed `npm run check`.

Teammates must pull the cleanup before restarting `convex dev`; an older branch can redeploy the removed gates.

For browser verification, sign in with a new Google account. Confirm organization creation opens immediately, a blank name fails, and a valid name opens an empty jobs dashboard. Reload and confirm owner membership remains. A second account must create a separate organization or accept a matching invitation as staff. Invitation acceptance must not create another organization. Verify the requested path, query, and fragment survive login and onboarding, subject to membership checks.

The broader owner/staff browser demo remains pending in the change task list. It covers shared jobs and categories, owner-only controls, invitation expiry and revocation, live staff removal, account switching, and return destinations.
