## Purpose

Prepare Electrical Work checklists with sourced work classification, useful inspector correspondence and copyable COES portal information while keeping certification under human control.

## ADDED Requirements

### Requirement: Approved Electrical checklist

The Electrical Work category SHALL contain eight items: classify prescribed versus non-prescribed work (`automated`), Road Closure (`automated`), book a Licensed Electrical Inspector for prescribed work (`third_party`), prepare COES information for ESVConnect (`third_party`), complete installation testing (`on_site`), confirm affected-circuit RCD coverage (`on_site`), confirm required independent inspection completion (`on_site`), and send completed COES to the client (`automated`, simulated in this PoC). New jobs SHALL copy these definitions with fresh pending status. Existing jobs and Carpentry templates SHALL remain unchanged.

#### Scenario: Create the prescribed demo

- **WHEN** a member creates an Electrical job at 198 Berkeley Street, Carlton for complete residential main-switchboard and consumer-mains replacement
- **THEN** the eight approved items are saved, pending items are classified and eligible items receive independent processing
- **AND** testing, RCD coverage and inspection confirmation remain human-controlled without execution threads

### Requirement: Evidence-based electrical work classification

The classification check SHALL evaluate saved detailed work scope against supported ESV guidance, save the finding, matched scope and source, and mark done only after that result is persisted. Category or title alone SHALL NOT establish that work is prescribed. Ambiguous, conflicting or unsupported work descriptions SHALL remain pending with an explanation. Live road checks SHALL retain exact saved road/locality relevance and existing failure and coverage behavior.

#### Scenario: Complete switchboard and mains replacement

- **WHEN** saved scope clearly requests complete main-switchboard and consumer-mains replacement
- **THEN** the result identifies prescribed work with a sourced reason
- **AND** it does not claim work, testing or inspection has occurred

#### Scenario: Ambiguous or excluded work

- **WHEN** scope is only “electrical repairs”, negates replacement or describes a potentially excluded single-component replacement
- **THEN** the system does not automatically treat it as the prescribed demo scope
- **AND** uncertainty is visible and the item remains pending unless a supported classification is established

### Requirement: Two structured Electrical request skills

The system SHALL provide a form-specific inspector-booking skill and a COES portal-preparation skill. They SHALL read saved job facts and return structured, reviewable output without requiring an uploaded source template. Inspector output SHALL be a copyable email with missing information and directions for choosing/contacting an inspector. COES output SHALL provide copyable values under labels verified from official portal guidance, a portal destination and human completion instructions. Unverified fields SHALL NOT be presented as exact official labels. Planned scope SHALL NOT be rewritten as completed installation work.

#### Scenario: Inspector booking preparation

- **WHEN** prescribed scope is established and the booking item runs
- **THEN** an email draft describes the real saved address and planned work, identifies unavailable recipient, licence, date, reference and access details, and stops waiting
- **AND** it does not claim an inspector is booked or an email was sent

#### Scenario: Portal preparation before work

- **WHEN** the COES preparation item runs before work is completed
- **THEN** it saves known portal information and clearly identifies missing actual work, testing and certification details
- **AND** the member can copy available values and open ESVConnect while signatures, declarations, licence numbers, certificates and test results are never fabricated

#### Scenario: Scope does not justify inspection

- **WHEN** saved scope is unresolved or non-prescribed
- **THEN** the inspector-booking item explains the unresolved or inapplicable condition instead of preparing a prescribed booking as fact

### Requirement: Useful labeled Electrical demo drafts

The two Electrical request skills SHALL fill missing general customer/contact information and proposed scheduling/access details using a consistent fictional demo profile. Saved values SHALL take precedence, and the site address SHALL always come from the saved job. Demo fields SHALL carry explicit provenance and visible labels retained when copied. Draft work descriptions SHALL remain grounded in saved scope and explicitly describe planned work for electrician review. Signatures, declarations, licences, inspector selection, actual testing/completion and certificate references SHALL remain human-controlled. Fictional values SHALL NOT be stored as confirmed job context or used to confirm certificate delivery.

#### Scenario: General information is absent

- **WHEN** an Electrical request runs with a saved address and contractor details but without general customer/contact or proposed access information
- **THEN** the draft includes the saved address and contractor details, labeled demo general values, and planned work-description wording
- **AND** missing human certification and inspector information remains explicit without leaving general draft fields empty

#### Scenario: Confirmed data replaces a demo value

- **WHEN** a member saves a real general value and retries the request
- **THEN** the new draft uses that value with saved-data provenance and removes its demo label
- **AND** unrelated checklist items, automated evidence and delivery confirmation remain governed by their existing rules

### Requirement: Safe integration with current Agent state

Electrical outputs SHALL preserve binary checklist statuses, manual notes, current organization access, independent threads, retry isolation and stale-write guards. Drafts SHALL remain pending/waiting. Errors SHALL retain an actionable reason and trace identity. Job Brief SHALL distinguish saved classification, portal/email drafts, simulated delivery and outstanding human work, and SHALL NOT reuse Carpentry-specific recommendations for Electrical items.

#### Scenario: Retry and edit

- **WHEN** a member retries one Electrical item or changes saved job context during its run
- **THEN** retry reuses its thread without changing siblings and stale writes are rejected
- **AND** prior output is not represented as a current completed result for changed context
