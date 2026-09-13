# Two-form Request Agent PoC

This PoC prepares editable draft applications for two Carpentry checklist items. It does not obtain a permit, appoint a surveyor, certify work or submit an application.

## What runs

```text
Saved pending checklist item
  -> classification
  -> independent item thread (same thread on retry)
  -> read saved job + select the matching form skill
  -> read the item's pinned library version
  -> fill a new PDF or DOCX draft
  -> save draft, provenance, human fields and next action
  -> waiting for contractor; checklist remains pending
```

On-site items remain human-controlled. Automated evidence checks keep their existing behavior and model. The Request Agent uses GPT-5.5 with medium reasoning; it must fail explicitly if that model or a required tool fails.

## Supported source versions

| Library document | Runtime skill | Inspected source |
| --- | --- | --- |
| Building Permit — Carpentry | `building-permit-request` | Central Goldfields Form 1, two-page flat PDF; editable fields are added over verified blanks. |
| Occupancy Permit — Carpentry | `occupancy-inspection-request` | Boroondara general building Form 15, two-page DOCX; editable text is added to the existing layout. |

The original Occupancy upload was a temporary-structure application. The user approved replacing it with the [Boroondara building application](https://www.boroondara.vic.gov.au/services/planning-and-building/building/building-permits-and-approvals/apply-amend-or-extend-building-permit) as version 2. Version 1 remains preserved. Form numbers alone do not establish compatibility.

Each filler verifies the source content fingerprint before editing. Changed or unsupported files fail explicitly. Category items refer to library documents; new jobs pin their current immutable versions. Replacing a library file does not change an existing job's pins.

Deployment setup uses `requestDocuments:registerSources`: supply the organization ID and the two `{ versionId, formKey }` pairs. It checks ownership and source fingerprints before adding compatibility metadata. It creates neither files nor categories. An ordinary replacement upload needs its own compatibility check; renaming it does not make it supported.

## Values and review

The property address comes verbatim from `jobs.addressText`. Saved applicant and contractor details take precedence over the fixed Ironbark demo profile. Missing general fields may use that profile, with `demo_data` provenance. Those values never become confirmed job facts or automated evidence.

Signatures, signing dates, editable declarations, approval references and unverified certificates remain blank. Preprinted council, surveyor and attachment text is preserved and explicitly flagged for review. A generated application does not establish that the preprinted council or surveyor applies to the job.

The original source is never overwritten. A successful run saves a separate draft Storage ID and its source version, missing fields and next action in the per-item Agent state. Draft downloads require access to that item's organization. Users should retain any copy they edit outside Site Ahead before regenerating a draft.

## Demo in the app

1. Open a job created from the Carpentry & Renovation category with both documents attached to their matching checklist items.
2. Use **Job information** for confirmed details. The saved job address is used automatically.
3. Process pending items, or process an individual item again after supplying information.
4. Watch its progress. After a Request item reaches **Waiting for you**, download its draft and review the listed human fields.

Missing information and failures remain visible after reload. Retry preserves the item's thread; completed checklist items are skipped. Manual notes and checkboxes remain available.

## Verification

On 14 September 2026, against the personal `sleek-lyrebird-565` development deployment:

- `npm run check`: 48 tests, frontend/backend TypeScript, lint, formatting and strict OpenSpec validation passed.
- `npm run build`: production build passed.
- `npm run verify:classification` and `npm run verify:langfuse`: live checks passed, with recorded model usage and reachable traces.
- `npm run verify:item-execution`: all three live automated tools passed, including DataVic exact match, manual fallback, no-year waiting and same-thread retry. Unsupported third-party requests failed explicitly.
- The live Request workflow produced both supported drafts, then regenerated Building on the same thread without changing its siblings. Each run used the five expected tools and stayed pending/waiting. Source and generated-file hashes matched their stored records.
- Langfuse recorded five `gpt-5.5-2026-04-23` usage observations beneath each of the three Request run spans: 15 total. The verifier initially omitted Langfuse's `model` projection; after correcting that query, its telemetry assertions passed against the same runs without repeating model calls. The correlated [Request trace](https://us.cloud.langfuse.com/trace/cd4bc272af40bffa73c3a4236c4c6f61) contains those runs.
- All four rendered draft pages were inspected. Both sources retained their original content; the Word package retained all parts except the edited document XML. Signature areas remained blank. Overflow and unsupported source layouts fail explicitly.
- Browser checks verified automatic classification, persisted progress after reload, saving structured road information, an isolated successful Road Closure retry, and an unchanged human-controlled asbestos item with a saved note.

Run the full Request check on the preserved development demo with `npm run verify:request-agents -- <QA job ID> <active QA user ID>`. It regenerates both pending request drafts and retries the first once. `REQUEST_FORM_QA_DIRECTORY` chooses where exported files and verification evidence are saved. This command is for the development QA organization, not customer jobs.

The preserved job is `kh7365vewzsy06ztg58xmgw47s8eant3`. It has downloadable draft records for both Request items; the three source versions remain intact. The UI displayed both drafts and their review fields, and both download buttons completed without an application error. The final native browser save/download check remains unverified because the Mac locked during that check. Authenticated download HTTP responses and cross-organization denial passed automated tests; actual stored draft bytes were separately downloaded and visually reviewed. OpenSpec task 6.1 remains unchecked until native browser delivery is confirmed.
