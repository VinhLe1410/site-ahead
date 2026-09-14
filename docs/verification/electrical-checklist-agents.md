# Electrical checklist PoC

This extension prepares a prescribed Electrical job, an inspector booking email and COES portal information. Certificate delivery is simulated: no email is sent. Testing, inspection and certification remain human responsibilities.

## Sample input

Choose **Electrical Work** and enter **198 Berkeley Street, Carlton** as the address. Paste this job description:

> The client contacted Son Tung Bui about replacing the complete residential main switchboard and consumer mains at 198 Berkeley Street, Carlton. They would like a quote and a site visit to discuss the work, how long the power would be off, and a suitable time to carry it out.

This fictional conversation summary describes the client's request. Inspection, form preparation and certification instructions belong to the agent workflow, not the client's brief. It records no agreed appointment, completed work or outage duration.

Use **Berkeley Street** and **Carlton** for the road lookup. Do not substitute another location to improve the result. A successful live lookup can validly return zero published matches.

## Approved checklist

| Item | Kind | Expected initial outcome |
| --- | --- | --- |
| Classify electrical work as prescribed or non-prescribed | Automated | Saved, sourced prescribed finding for this explicit scope |
| Road Closure | Automated | Validated live result, or explicit missing information/failure |
| Book a Licensed Electrical Inspector — prescribed work only | Third-party | Reviewable email draft; remains pending |
| Prepare COES information for ESVConnect | Third-party | Copyable preparation fields; remains pending |
| Complete electrician’s installation testing | On-site | Human-controlled, pending |
| Confirm safety-switch/RCD coverage for affected circuits | On-site | Human-controlled, pending |
| Confirm required independent inspection is completed | On-site | Human-controlled, pending |
| Send the completed COES to the client | Automated | Waiting for certificate and recipient confirmation; simulation only |

The development category was created in the existing Agent implementation QA organization on 14 September 2026. Existing Carpentry categories and jobs were preserved.

## Source basis and limits

- [ESV prescribed and non-prescribed work](https://www.energysafe.vic.gov.au/certificates-electrical-safety/obligations-and-guidelines/prescribed-and-non-prescribed-work) identifies applicable scope and single-component exceptions. The PoC supports narrow rules and leaves unclear work unresolved.
- [ESV switchboard replacement guidance](https://www.energysafe.vic.gov.au/industry-guidance/electrical/frequently-asked-questions/ensuring-power-until-inspection) supports the full residential main-switchboard replacement example.
- [ESV COES fundamentals](https://www.energysafe.vic.gov.au/sites/default/files/2025-07/COES_Fundamentals_Jan-2024.pdf), pages 4 and 6, explains customer information, work descriptions and certificate completion. Page 4 explicitly names the portal’s **Customer email** field and explains the portal’s own automatic distribution.
- [ESV’s linked COES guide](https://www.energysafe.vic.gov.au/sites/default/files/2024-11/Quick-Reference-Guide-V5.1.pdf) identifies **Description of work**, test results, notes and the inspection allocation workflow. Its URL says V5.1 but the inspected document footer says V4, 10 July 2020. Its printed certificate sample is not evidence of current authenticated portal labels.

Field guidance is based on these public official documents. The authenticated portal has not been inspected. Only documented labels should be presented as official field labels; other missing details are guidance. An inspector booking email has no universal portal field schema. Choose an appropriate inspector and confirm their booking requirements before using the draft.

## Verified development demo

Open [198 Berkeley Street, Carlton](http://localhost:5173/app/jobs/kh73eh5fdpeq0e63akxhg242z98ebacm) in the existing development app. The category is `k5776pejp4zha89m0y42y79t0n8eabq0` in the Agent implementation QA organization on `sleek-lyrebird-565`.

On 14 September 2026:

- The eight saved items match the approved checklist. Five eligible items have five distinct persistent threads; the three human checks have none and remain pending.
- The saved scope produced a sourced **prescribed** finding. The live Transport Victoria lookup returned **zero** published exact matches for Berkeley Street, Carlton. That does not establish a clear route.
- Both request items saved structured drafts and stopped pending/waiting. Each actual GPT-5.5 run called `read_saved_job`, `select_electrical_skill`, `prepare_electrical_draft` and `save_electrical_draft`. The COES address equals the saved Carlton address. The initial version left **Description of work** blank; later approved feedback adds explicitly planned draft wording as described below. No Carpentry fictional profile was used.
- Retrying the inspector request reused its thread, saved a new run and left every sibling run unchanged.
- The Job Brief summary function, evaluated against the live saved records, reports two completed checks, two prepared drafts and six pending items. It distinguishes planned preparation from completed certification.
- The main demo has no completed certificate uploaded. Delivery remains pending/waiting with an explicit simulation explanation.

An isolated disposable job used a PDF visibly marked **TEST FILE — NOT A COES**, with recipient `qa@example.invalid`. Authenticated upload and download preserved the exact bytes. Confirmation resumed the same thread and saved `mode: simulation`, `emailSent: false`, then marked only that test item done. Repeating confirmation preserved its confirmation identity and simulation time. The Job Brief explicitly reported **Simulated delivery — no email sent**. The disposable job and category were then removed through the normal authenticated APIs; job deletion includes cleanup of its private certificate. The main Carlton job was preserved.

[The Carlton trace](https://us.cloud.langfuse.com/trace/761ba4b84421f6d16ade8cb1b1409b3f) contains 12 actual GPT-5.5 model steps across the two initial drafts and inspector retry. [The simulation trace](https://us.cloud.langfuse.com/trace/879c8be5982e390ce27471fb0146fef6) contains separate waiting and successful simulation runs without model or email-provider calls.

## General demo information feedback

The user subsequently authorized invented general Electrical draft information and supplied their contractor name and email. Those supplied values are saved only in the Carlton job's context, not hardcoded into a global profile. The address remains **198 Berkeley Street, Carlton**.

Missing general draft values now use a consistent Electrical demo profile: fictional customer Alex Morgan and an example-domain email, a demo contractor phone, and proposed attendance/access information. Every invented value has `demo_data` provenance and an explicit label retained when copied. Saved values take priority. These defaults never become confirmed job context or delivery recipients.

Both requests include the supplied contractor details. COES **Description of work** now contains concise planned wording grounded in the recognized scope, clearly requiring electrician review before certification. The full original briefing instructions remain in the reference field rather than being copied into the email body. Actual inspector selection, licence details, signatures/declarations, test results, inspection/completion dates and certificate references remain for human completion.

The two drafts were regenerated from the browser on their existing threads (inspector run 3, COES run 2). Both contain the saved contractor name/email, exact address, labeled general defaults and `demo_data` provenance. No fictional customer email was written to job context. The two completed automated findings and all pending human/certificate items remain unchanged.

Browser checks confirmed that **Copy email draft** includes the supplied contractor name/email, exact address, concise planned scope and demo labels. **Copy Customer email** retains its demo marker and fictional address. Both populated drafts persist after reload. The destination links point to the official ESVConnect login and ESV inspector-register page; authenticated portal labels remain subject to the public-guide limitation above.

## Checks and browser verification

- `npm run check`: **78 tests in 11 files**, frontend/backend type checks, lint, formatting and strict OpenSpec validation passed after the demo-information update.
- `npm run build` passed. Vite retains its existing advisory about a bundle over 500 kB; no check was disabled.
- `npx convex dev --once` deployed successfully to the personal development backend.
- Source implementation was split into `77942fd` (classification/contracts), `60068fa` (structured request drafts) and `f27155b` (certificate upload/simulation).
- `13bf147` adds the approved general demo values, provenance and planned wording.

The Mac became accessible during the demo-information update. Browser upload and confirmation were exercised in a separate disposable job using the **TEST FILE — NOT A COES** PDF and `qa@example.invalid`. The Job Brief displayed **Simulated delivery — no email sent**, marked only that test item done, and retained the result after reload. The temporary tab, job and category were removed. The main Carlton demo retains its pending real certificate requirements.

## Integration with main's compact UI — 14 September 2026

Merged `origin/main` at `a30412f` into the Electrical branch. Retained main's compact checklist, next-action layout, details panel and conversational intake. Electrical request drafts and certificate controls now render inside that details panel. Shared output freshness includes the per-item certificate, and both Electrical finding types and portal/email drafts remain represented in checklist summaries.

`npm run check` passes with 79 tests in 11 files, including a presentation integration case for Electrical drafts, simulated completion and invalidation after recipient/address changes. `npm run build` passes with the existing bundle-size advisory. The combined backend deployed successfully to the existing development deployment `sleek-lyrebird-565`; production was not changed.

Browser verification on the Carlton demo confirmed the prescribed classification, saved road result, two ready drafts, inspector email copy, COES customer-email copy, and the completed-certificate upload controls with explicit simulation labeling. Both drafts retain the exact job address, supplied contractor details and labeled demo data. No certificate was uploaded or sent during this merge verification, and the job remains at two of eight checklist items done. The earlier full delivery simulation verification above still applies; backend delivery implementation was unchanged by the merge.

Unfinished all-job preparation and alternate compact-UI work was stashed separately before merging and is excluded from this integration.
