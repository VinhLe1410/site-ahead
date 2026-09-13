# Electrical checklist PoC

This extension prepares a prescribed Electrical job, an inspector booking email and COES portal information. Certificate delivery is simulated: no email is sent. Testing, inspection and certification remain human responsibilities.

## Sample input

Choose **Electrical Work** and enter **198 Berkeley Street, Carlton** as the address. Paste this job description:

> Please replace the complete residential main switchboard and the consumer mains at 198 Berkeley Street, Carlton. This is planned installation work; it has not started. Arrange a Licensed Electrical Inspector for the prescribed work. Prepare the inspector booking request and the information we can review before entering it in ESVConnect. The electrician still needs to complete installation testing and confirm RCD coverage; the independent inspection and COES certification are outstanding. The client and contractor contact details, licence numbers, inspection date, actual test results and certificate reference have not yet been supplied. Do not describe any of these steps as completed.

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
- Both request items saved structured drafts and stopped pending/waiting. Each actual GPT-5.5 run called `read_saved_job`, `select_electrical_skill`, `prepare_electrical_draft` and `save_electrical_draft`. The COES address equals the saved Carlton address; the actual **Description of work** remains blank for the electrician. No Carpentry fictional profile was used.
- Retrying the inspector request reused its thread, saved a new run and left every sibling run unchanged.
- The Job Brief summary function, evaluated against the live saved records, reports two completed checks, two prepared drafts and six pending items. It distinguishes planned preparation from completed certification.
- The main demo has no completed certificate uploaded. Delivery remains pending/waiting with an explicit simulation explanation.

An isolated disposable job used a PDF visibly marked **TEST FILE — NOT A COES**, with recipient `qa@example.invalid`. Authenticated upload and download preserved the exact bytes. Confirmation resumed the same thread and saved `mode: simulation`, `emailSent: false`, then marked only that test item done. Repeating confirmation preserved its confirmation identity and simulation time. The Job Brief explicitly reported **Simulated delivery — no email sent**. The disposable job and category were then removed through the normal authenticated APIs; job deletion includes cleanup of its private certificate. The main Carlton job was preserved.

[The Carlton trace](https://us.cloud.langfuse.com/trace/761ba4b84421f6d16ade8cb1b1409b3f) contains 12 actual GPT-5.5 model steps across the two initial drafts and inspector retry. [The simulation trace](https://us.cloud.langfuse.com/trace/879c8be5982e390ce27471fb0146fef6) contains separate waiting and successful simulation runs without model or email-provider calls.

## Checks and remaining browser verification

- `npm run check`: **77 tests in 11 files**, frontend/backend type checks, lint, formatting and strict OpenSpec validation passed.
- `npm run build` passed. Vite retains its existing advisory about a bundle over 500 kB; no check was disabled.
- `npx convex dev --once` deployed successfully to the personal development backend.
- Source implementation was split into `77942fd` (classification/contracts), `60068fa` (structured request drafts) and `f27155b` (certificate upload/simulation).

Browser interaction verification remains open: the computer-use tool reported that the Mac was locked, and an unlock request is pending. Copy-button behavior, browser upload/confirmation and visual persistence after reload have **not** been verified. Backend persistence, actual upload/download, draft retries and summary behavior passed the checks above. Once the Mac is unlocked, finish task 4.2 in the OpenSpec change; use a separate marked QA fixture for the simulation and leave the main demo’s real certificate requirements pending.
