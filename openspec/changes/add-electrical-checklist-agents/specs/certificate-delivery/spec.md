## Purpose

Let contractors upload a completed electrical certificate, confirm its recipient and demonstrate a clearly labeled delivery simulation without sending email.

## ADDED Requirements

### Requirement: Confirmed certificate and recipient

An active organization member SHALL be able to upload a completed COES PDF belonging to the assigned job and explicitly confirm the recipient email and certificate identity. A draft, finished drafting run or checkbox alone SHALL NOT establish certificate completion. Uploads SHALL be item-scoped, size and content validated, privately retrievable, and unavailable across organizations. No automated portal completion detection is claimed.

#### Scenario: Missing prerequisites

- **WHEN** the delivery item has no confirmed certificate or recipient
- **THEN** it remains pending/waiting with instructions explaining what the member must provide
- **AND** no delivery result is recorded

#### Scenario: Invalid or unauthorized upload

- **WHEN** a caller supplies invalid file content, an oversized PDF or another organization's item
- **THEN** the request fails with an actionable error without linking an unauthorized file or changing the item status

### Requirement: Explicit simulated delivery

After certificate and recipient confirmation, the system SHALL automatically persist a simulated delivery result and mark the demo item done only after that save succeeds. The result and Job Brief SHALL state that delivery was simulated and no email was sent. The system SHALL NOT call an email provider, emit a real delivery receipt, or infer that COES certification or inspection occurred. Repeated requests SHALL NOT create duplicate simulation records for the same confirmed input.

#### Scenario: Successful simulation

- **WHEN** the member confirms the certificate and recipient and processing succeeds
- **THEN** the saved result identifies the confirmed file, recipient, time and simulated mode
- **AND** the checklist item is done with an explicit “Simulated delivery — no email sent” explanation

#### Scenario: Retry, changed context or deletion

- **WHEN** a run is retried, a job or recipient changes, access is removed, or the owning job is deleted
- **THEN** duplicate and stale writes are prevented, unrelated item state remains unchanged and unneeded private files are cleaned up without deleting shared library sources
- **AND** failures remain visible and pending rather than claiming delivery
