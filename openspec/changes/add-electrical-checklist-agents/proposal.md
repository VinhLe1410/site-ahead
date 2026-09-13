## Why

The current checklist agents prepare local Carpentry forms only. Electrical contractors also need prescribed-work classification, inspector booking text and COES portal information, followed by delivery of the actual completed certificate to the client.

## What Changes

- Add the approved eight-item Electrical Work checklist and a prescribed-work example at 198 Berkeley Street, Carlton. Preserve existing category/job templates and Carpentry behavior.
- Classify the saved electrical scope with a supported, sourced rule and explicit unresolved outcomes; reuse the live Road Closure check for Berkeley Street / Carlton.
- Add two GPT-5.5 runtime skills: an inspector booking email and copyable COES fields with verified ESVConnect labels, source guidance and missing information. These require no local source document and never certify or submit a form.
- Use saved address and contractor details first; fill missing general draft information with labeled fictional demo values. Keep signatures, licences, test results and certification facts human-controlled. Draft work descriptions remain explicitly planned until reviewed.
- Keep installation testing, RCD coverage and independent inspection confirmation human-controlled. Drafting remains pending/waiting.
- Add authenticated upload of the actual completed COES and explicit recipient confirmation. The user chose simulation for this PoC: persist a clearly labeled simulated delivery, then complete the demo item. No email is sent and no real delivery is claimed.
- Extend progress, structured logs, traces and the Job Brief for the new outputs without changing binary checklist status or manual notes.

## Capabilities

### New Capabilities

- `electrical-checklist-agents`: Electrical classification, structured portal/email drafts and the approved demo checklist.
- `certificate-delivery`: Confirmed completed-certificate upload, recipient confirmation and explicitly simulated delivery status.

### Modified Capabilities

None. Existing category templates, job ownership and manual checkbox semantics remain compatible.

## Impact

Touches Convex Agent contracts, workers, persistence, scoped Storage transfers, job controls, summary logic and tests. Reuses existing per-item threads, leases, snapshots and organization access. No email provider or credentials are required for the approved simulation. User approval covers implementation and database setup.
