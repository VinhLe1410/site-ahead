## Why

The current UI uses generic styling, repeated page descriptions, and a separate card and note editor for every checklist item. The team approved the [Site Ahead prototype](https://claude.ai/code/artifact/5b4fbb07-b655-4f65-a95d-453a93fb6415) as the visual reference, with quieter working pages and notes opened per item.

## What Changes

- Apply the prototype's amber, charcoal, pale backgrounds, Geist typography, and square controls consistently through the shared UI.
- Give the landing page a headline and an explicitly illustrative checklist using current product behavior.
- Simplify Jobs, Categories, Organization, forms, authentication, and error screens. Keep useful labels, account details, error recovery, and action consequences.
- Replace checklist cards with compact rows. A speech-bubble button opens an inline note editor. Saved notes appear beneath their item; empty notes take no extra space.
- Preserve manual completion, independent job status, shared organization access, current routing, pagination, invitations, and confirmed deletion.
- Exclude the prototype's simulated automation, reports, voice intake, search, additional data fields, and routes. No backend or dependency changes are needed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-access`: Consistent visual identity and concise working screens across existing routes.
- `job-management`: On-demand note editing and visible saved note previews within compact checklist rows.

## Impact

Changes affect `src/index.css`, shared UI primitives and authored components, and existing page composition. Existing Base UI interactions and Convex hooks remain in use. The implementation depends on the organization behavior in `main` and leaves the archived organization change untouched.
