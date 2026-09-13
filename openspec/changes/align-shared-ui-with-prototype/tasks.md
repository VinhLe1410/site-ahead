Depends on the organization behavior in `main`, documented by the archived `2026-09-13-add-organization-tenancy` change. Leave its artifacts untouched.

## 1. Shared styling

- [x] 1.1 Apply the prototype theme and semantic colours in `src/index.css`; adjust existing primitive sizing, corners, and table treatment. Verify light and dark colours, focus visibility, and consistent fields, buttons, menus, and dialogs.
- [x] 1.2 Add the shared brand treatment and simplify `PageHeading` and `AppLayout`. Verify readable organization and account identity, active navigation, and breadcrumbs.

## 2. Existing pages

- [x] 2.1 Simplify Jobs, Categories, and their forms into compact lists and labelled fields. Verify existing pagination, required fields, optional categories, template editing, and consequence messages remain available.
- [ ] 2.2 Replace checklist cards with compact rows and inline note editing in the job feature. Verify add, edit, clear, cancel, failure/retry, preview, keyboard focus, and independent checkbox and job status behavior. Update the README's note instructions.
- [x] 2.3 Apply the same style and concise copy to organization, invitation, auth, and error screens. Verify account creation, sharing, access errors, and destructive confirmations retain their required information.
- [x] 2.4 Rebuild the landing composition around a headline and fictional example checklist. Verify public access, signed-in and signed-out destinations, and accurate descriptions of current capabilities.

## 3. Verification

- [ ] 3.1 Review desktop screenshots with long text, note previews, an expanded editor, empty states, failures, and open dialogs. Exercise keyboard navigation and reduced motion. Record the actual verification method and any live-data limitations.
- [x] 3.2 Run `npm run check` and a production frontend build, then complete a short browser demo against the change's acceptance scenarios. Report results without adding a test suite or deploying the backend.

## Verification record

`npm run check` and the production frontend build passed. The build reports a bundle-size warning. Implementation is complete. Live desktop checks used the developer's signed-in account and temporary records. Verified note add, edit, cancellation, clearing, two-line previews, full editor contents, focus return, keyboard navigation into the editor, labelled checkboxes, and independent item and job status. Category creation and the optional-category job form worked through the existing backend. Reviewed the landing page and shared app styling. The remaining forced note failure/retry check and full desktop visual review are pending under 2.2 and 3.1. Mobile work is deferred at the developer's request.

Browser work stopped when the developer reassigned port 5173 to another agent and requested checks, commit, push, and a PR. No further browser interaction is authorized for that port in this task.

The following temporary records still need cleanup on `brainy-gopher-762`. Delete this job before its category; leave all other records alone:

- Job `kh73a2s88y9eqkkcv9q1j30h8d8eahq5`, address `18 Example Street`.
- Category `k5729q10faydfh3dca1f25gmwd8eaq60`, title `UI review`.
