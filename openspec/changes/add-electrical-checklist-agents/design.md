## Context

See proposal.md for the approved extension. The existing Convex dispatcher uses one persistent thread per eligible item, bounded concurrent leases, context snapshots and validated saves. Current request drafts require pinned local PDFs/DOCX; Electrical requests instead need structured text. The current branch also includes Carpentry preparation suggestions; preserve that scope and behavior.

## Goals / Non-Goals

**Goals:** Add the eight approved Electrical items and a working Carlton demo, two source-grounded structured skills, and a completed-certificate delivery simulation through existing job controls.

**Non-Goals:** Portal login automation, certification, actual inspection or test results, live email sending, webhook delivery, deadline automation, invented Electrical demo credentials, or broad support for every prescribed-work exception.

## Decisions

### Extend current state additively

Keep existing local file drafts compatible. Add typed structured request output for email/portal fields, destination, guidance, missing values and provenance, plus a classification finding and an explicitly simulated delivery finding. Store actual certificate uploads in item-owned Convex Storage with a small indexed confirmation record. Use existing ownership, run and snapshot guards. Keep confirmed input separate from generated copy so an LLM cannot fabricate certifications or recipients.

### Source-bound classification and skills

Use saved detailed scope with narrowly supported ESV rules; unclear or contradictory input remains unresolved. Full main-switchboard and consumer-mains replacement is the approved prescribed example. Reuse the Road Closure tool with Berkeley Street / Carlton. Inspect ESV's current linked COES guide for field labels and navigation; expose only verified labels as portal fields and clearly distinguish general instructions or missing information. One runtime skill describes LEI booking email preparation; the other describes COES portal preparation. Keep GPT-5.5 tool selection and observability consistent with existing request agents. Known facts come from saved job context, not the Carpentry fictional profile. When work has not started, describe it as planned and leave completed-work assertions for the electrician.

### General demo draft values

The user subsequently approved fictional general information for Electrical drafts. Use a consistent Electrical demo profile for missing customer/contact information and proposed scheduling/access details, with per-field demo provenance and labels retained in copied text. Saved facts always win; the saved job address has no fictional fallback. Store the user's supplied contractor name/email in that job's trusted context, not in global defaults. Provide draft work-description wording grounded in the saved scope and explicitly marked as planned for electrician review. Actual licences, inspector selection, signatures, declarations, testing, completion dates and certificate references remain human-only. Demo values exist only in request output and never populate confirmed job context or authorize certificate delivery. This supersedes the earlier saved-facts-only limitation for general Electrical draft values.

### Simulated delivery only

The user explicitly selected simulation after being asked about email-provider setup. Implement no provider integration. The member uploads an actual completed COES PDF and confirms recipient and certificate; that confirmation resumes the delivery item. Persist mode, input identity and simulated outcome atomically before marking the demo item done. Duplicate requests and late runs cannot replace current confirmation or claim multiple sends. UI and summary explicitly say no email was sent. ESVConnect itself can distribute a completed COES when customer email is provided, so later live-delivery work must consider avoiding an extra copy.

### Reviewable UI

Extend existing item controls with copyable draft email/field values, destination links and missing-information guidance. Extend Job information only for the trusted fields needed by these two skills. Add a scoped upload and explicit certificate/recipient confirmation control for delivery. Preserve manual checklist changes, current-state summary checks, retries and existing download controls.

## Risks / Trade-offs

- [Public guide may differ from authenticated portal screens] → Cite the inspected guide/version, avoid invented exact labels and expose any unverified fields as guidance or missing information.
- [Work classification has exceptions] → Scope supported rules narrowly, record source and unresolved outcomes, and test negation and single-component ambiguity.
- [Demo might imply real certification or delivery] → Keep human fields blank and visibly label simulated delivery in both item and summary.
- [Generated output or certificate becomes stale] → Include relevant confirmation/context in existing run guards; preserve prior output as historical and reject late writes.

## Migration Plan

Land compatible contracts/classification, then structured skills and controls, then scoped upload/simulation. Seed or update only the approved Electrical category in the authorized development organization; create the new Carlton job after implementation is deployed. Preserve existing Carpentry records. Run quality checks, live model/road checks, browser copying and upload simulation. Rollback disables Electrical processing while retaining diagnostic state; no provider side effects exist.
