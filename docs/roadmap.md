# Site Ahead PoC roadmap

Build one working contractor journey with three owners: **Agent**, **Backend**, and **Frontend**. Focus on the scoped PoC in one agreed desktop browser. Keep the existing stack: Convex, React, Vite, Tailwind, OpenAI, and ElevenLabs Scribe.

Sources: [Idea, especially Step 4](Site-Ahead-Idea.md), [Architecture](Site-Ahead-Architecture.html), [checklist research](Job_Checklist_Research_Tradie.docx), and [request examples](Third_Party_Form_Examples.docx). Reuse the Google/Convex Auth and routing work from [PR #9](https://github.com/VinhLe1410/site-ahead/pull/9); incorporate its changes into the working base if not already present.

## Current authorized implementation

`add-checklist-item-agents` implements the Carpentry & Renovation item-processing slice, including minimal run/retry/context/result/draft controls. Its [proposal](../openspec/changes/add-checklist-item-agents/proposal.md), [design](../openspec/changes/add-checklist-item-agents/design.md), and acceptance scenarios govern this work. The broader intake, Electrical Work, voice, reporting, and manual submission/receipt milestones below remain later work for this change.

Use live DataVic, EPA AirWatch, and Transport Victoria checks, with validated site relevance. Powerlines is excluded. DataVic is tried first; only a successful no-match or absent-year response allows an available validated contractor-confirmed year from the saved job, attributed to the supplying member/time and labeled manual. Valid live data wins. Missing information stays unresolved and pending; API/validation failures stay failed and pending even with a manual year. Never change a failed automated check to on-site silently.

Reuse active organization membership access and the existing document library: immutable `documentVersions`, source Storage IDs, category document references, and item-pinned version IDs. Runtime form skills use minimal compatibility metadata and create new PDF/DOCX draft files. Do not introduce a second form catalog. Only supported forms may be filled; sample drafts are clearly labeled.

The current Request Agent PoC is limited to the uploaded Building Permit — Carpentry PDF and Occupancy Permit — Carpentry DOCX, with one runtime skill each and GPT-5.5 at medium reasoning. The user approved replacing the temporary-structure Occupancy upload with Boroondara Council's general building application as version 2, preserving version 1. Use the actual saved job address and confirmed details; the user authorizes a consistent fictional Ironbark profile for missing general fields. Label these values as demo data and never save them as confirmed job facts. Leave signatures, signing dates, declarations, approval/certificate references and unverified attachment claims for human confirmation. The updated [form examples](Third_Party_Form_Examples_Update.docx) guide field meaning; the actual source versions determine layout and fillable fields. This specific exception supersedes the general missing-value guidance below for these two demo drafts only.

The user's demo feedback adds individual saved road-disruption details and a live Job Brief summarizing completed work and suggested next actions in priority order. Derive this view from current checklist and Agent state, retain the original input, and keep full generated/persisted reports as later work. Preserve a demo job with genuine results from all three live automated sources; zero published road matches is a valid result, not a promise of clear access.

The separate `add-pre-visit-preparation-suggestions` extension adds automatic preparation for every saved job, including Electrical, custom categories and uncategorized jobs, with explicit generation/refresh for existing jobs. It recommends zero to three grounded before-visit actions, directly checked off or dismissed by organization members. Refresh preserves completed tasks and their original grounding. Pending client-answerable questions produce an editable saved message for review, regeneration and manual copying; internal tasks are omitted. Nothing is sent, and preparation never changes checklist status, job status or agent dispatch. The user approved this preparation expansion while keeping main's UI. Additional automated trade checks, form skills, voice changes and broader reporting remain separate work.

The user subsequently approved compact third-party review: editable email/portal copy, no duplicate email field list, and expandable supporting guidance. For Electrical review, one short example-details notice replaces repeated DEMO DATA markers; saved field provenance remains available. Edits affect copied text locally and are explicitly not saved after closing the view. This display/copy decision supersedes the earlier requirement to repeat labels on every copied value.

## Broader PoC scope

Electrical request demo feedback permits labeled fictional general customer/contact information and proposed scheduling/access details. Saved addresses and contractor information always win; signatures, licences, inspector selection, test results and certification facts remain human-controlled. Demo output never becomes confirmed job information or an authorized delivery recipient.

The separately approved `add-electrical-checklist-agents` extension adds eight Electrical Work items, a prescribed main-switchboard/consumer-mains replacement demo at 198 Berkeley Street, Carlton, two structured LEI email/COES portal skills and a completed-certificate upload/recipient-confirmation flow. The user chose simulated delivery: completion records a clearly labeled simulation and no email is sent. This extends the earlier Carpentry-only boundary for this change; human testing, RCD checks and inspection confirmation remain manual.

- Contractor signs in, enters an address and job type, and pastes or records the client's message.
- The platform creates a tailored checklist for **Carpentry & Renovation** or **Electrical Work**.
- Each eligible checklist item gets its own sub-agent, which progresses that item independently.
- Contractors review drafts, manually record submission/receipt, and complete on-site checks.
- A report summarizes findings, pending work, and next actions.

Use fictional Ironbark Site Services jobs for demos, while labeling live evidence and contractor-provided values by their actual source. Sample forms are **Sample request drafts**, not official authority templates. Defer other trades, email sending/watching, automatic portal submission, CRM, deadline automation, and voice Q&A.

## Agreed decision: one sub-agent per eligible checklist item

**After job creation saves a checklist, automatically classify pending items and dispatch one logical sub-agent for each successfully classified Automated Check and Third-Party Request. Do not assign sub-agents to On-Site Checks.** Contractors can explicitly start processing existing jobs and retry individual items. Manual checkbox and note edits never dispatch work.

Each item has its own saved agent context and progress. Reuse specialist agent definitions across items, but keep each item's execution and conversation separate. An agent owns one item, not the entire checklist.

| Item category | Sub-agent responsibility | Human responsibility |
| --- | --- | --- |
| Automated Check | Read validated, site-relevant evidence through the three supported live tools and save the finding with provenance. | Resolve missing information or perform a manual check when automation cannot answer. |
| Third-Party Request | Prepare the request, identify missing information, and revise it when the contractor supplies that information. | Review/edit, submit externally, and manually record receipt or completion. |
| On-Site Check | No sub-agent execution. | Visit/check manually, add a note, and mark complete. |

**Progress does not require immediate completion.** An item may remain awaiting information, review, or a reply. The agent stops running while waiting; Convex saves its context. New contractor information or an explicit retry starts another run for that same item and context. Recording submission or receipt can update status directly without an unnecessary LLM call. There is no inbox polling in this PoC.

An item's agent finishing a run does not mean the checklist item is done. In particular, a prepared request is not a received reply, approval, or site clearance. If an Automated Check cannot be answered, retain its kind and pending status with an explicit unresolved reason or failure. Classification failures create no execution thread; execution retries reuse the existing thread.

### Convex implementation

Use `@convex-dev/agent` inside Convex actions for the per-item agents, with one persistent Agent thread per eligible item. This is the concrete need for the Agent component: saved item context and resumable, tool-using work. Use ordinary bounded calls for intake extraction and report synthesis where sufficient. Convex supports [agent definitions and threads](https://docs.convex.dev/agents/agent-usage) and [multiple-agent orchestration](https://docs.convex.dev/agents/workflows).

A simple dispatcher reads item categories and schedules independent item actions. It does not need an LLM to decide which rows are eligible. Use reusable Evidence and Request agent definitions, pass the job context and assigned item, and expose only the tools needed for that item. Keep execution bounded and save results through internal mutations. A workflow engine, agents spawning further agents, and a general-purpose agent network are outside this PoC.

```text
Confirmed intake -> tailored checklist
                         |
                         +-> Automated item -> its Evidence sub-agent
                         +-> Request item   -> its Request sub-agent
                         +-> On-site item   -> contractor only

Each item saves progress -> live checklist -> report of current state
New information/retry   -> resume only the affected item's sub-agent
```

## Shared contract and ownership

Agree the small shared contract before splitting implementation. Backend owns `convex/contracts.ts`, schema, generated bindings, dependency/configuration changes, and integration. Agent owns `convex/agents/**`. Frontend owns job pages and components under the existing route structure.

| Record | Minimum data |
| --- | --- |
| Job | Organization, input/category references, address, status, and optional contractor-confirmed context with member/time attribution. Intake extraction and report fields remain later work. |
| Checklist template | Organization category with item title, kind, and document IDs. Trigger tailoring remains later work. |
| Checklist item | `_id`, `_creationTime`, `jobId`, `title`, `kind`, binary `status`, human `notes`, and optional pinned `documentVersionIds`. |
| Item agent state | Separate record with item/job IDs, classification attempt, optional execution thread ID, latest run/trace IDs, execution state, current step, finding or draft, provenance, missing information, next action, and error. Thread history lives in the Agent component. |

Use `automated`, `third_party`, and `on_site` as category values. Keep **item status** separate from **agent execution state**:

- Checklist status for every kind: `pending | done`. Automated completion requires a validated saved finding; third-party drafts remain pending; human completion uses existing checkboxes.
- Agent execution: `idle`, `running`, `waiting`, `finished`, or `failed`. On-site items have no execution thread.
- Classification retries and execution retries are isolated. Atomic claims prevent duplicate states/threads and overlapping runs; expiry recovery and snapshot guards protect against stale writes and human changes.

Backend exposes typed operations for creating/reading jobs, starting checklist preparation, reading items, providing item information/resuming its agent, saving/approving drafts, marking sent/received, completing on-site work, audio intake, and generating reports. Agent uses internal operations to read its assigned context and save progress/results. Frontend uses the generated Convex API.

Preserve existing authentication and check current active organization membership on domain operations. Keep provider keys server-side. Prevent duplicate agents for the same item and overlapping runs; retries must reuse the item's thread and preserve contractor edits. Validate statuses and model output on the server.

## 1. Agent work

### A1. Set up agent observability

- [x] Add a shared observability helper (e.g. `convex/agents/shared/observability.ts`) providing `rawRequestResponseHandler`, `contextHandler`, and `usageHandler` with payload-minimized structured logging for every Agent instance, per @convex-dev/agent's documented debugging and usage-tracking hooks.
- [ ] Enable `experimental_telemetry` on every agent generate/stream call so OpenTelemetry spans (model, tokens, prompt, response) export to Langfuse Cloud via its OTLP endpoint. New env vars: `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`. Coordinate the new dependency and env var additions with Backend — dependency/configuration changes are Backend's per the shared contract above.
- [ ] Confirm every item-agent action declares the Node.js runtime (`"use node"`), required by the OpenTelemetry exporter package.
- [x] Verify with one smoke-test call that a trace reaches Langfuse before wiring this into the real Evidence/Request agents (now A3, see below).

### A2. Classify checklist items into resolution categories

- [x] Take the job's resolved checklist as input — for now, simulate this as if provided by Backend, since real checklist retrieval/persistence isn't wired up yet.
- [x] Classify each checklist item into exactly one of three defined categories: Automated Check, Third-Party Request, or On-Site Check.

### A3. Implement the item sub-agents

#### A3.1. Wire up live API checks for Automated Check items

- [ ] For each Automated Check item that needs an external data source, identify and select the appropriate API for that specific task (e.g. EPA Victoria AirWatch for an air-quality check).
- [ ] Call the selected API and receive a response in the expected format.

Success criteria:

- [ ] Able to choose the API that matches the task.
- [ ] Request to the API succeeds and returns a correctly-formatted response.

#### A3.2. Create Agent tools for each Automated Check API

- [ ] For each Automated Check API confirmed working in A3.1, wrap it as a standard Agent tool (name, description, input schema, and clear guidance on when to use it), following this codebase's existing tool-definition conventions.
- [ ] Write each tool's description specifically enough that an agent can correctly pick the right tool for a given checklist item — not a generic "call an API" description.

Success criteria:

- [ ] Every Automated Check API from A3.1 has a corresponding tool with name, description, and input schema.
- [ ] Tool descriptions are specific enough to disambiguate between tools when more than one exists.
- [ ] A basic agent call can actually invoke a tool and get back the same correctly-formatted response already confirmed in A3.1.

#### A3.3. Spawn per-item agents and handle Third-Party Requests

- [ ] Define reusable Evidence and Request agents with OpenAI, focused instructions, and item-specific tools.
- [ ] For each eligible item, create its Agent thread once, save the association, and run the agent with the job context and assigned item. Skip on-site items entirely.
- [ ] Evidence tools return validated live findings or the explicit manual-year fallback. Save provenance; missing answers remain unresolved and pending, and failures remain failed without kind changes.
- [ ] Request agents select compatible runtime skills and item-pinned library form versions, fill supported PDF/DOCX drafts, and leave missing names, dates, licence details, and contacts blank for the contractor. No sending is implemented.
- [ ] Save the next action and stop when waiting for information/review/reply. Resume the same item's thread when Backend schedules a new run after information or retry. Do not overwrite approved/submitted drafts or automatically send requests.

### A4. Add voice intake and reporting

- [ ] Transcribe stored audio through ElevenLabs Scribe; return editable text to the intake screen. Confirmed text enters the same extraction path as pasted text.
- [ ] Generate a short report from saved checklist state, including completed findings, pending requests, manual checks, and next actions. Label evidence provenance and do not assume pending work is complete.
- [ ] Verify two different trade checklists, one message-triggered variation, and one waiting item that resumes after new information.

**Deliver:** item-category classification, observability scaffolding, per-item agents/tools, transcription, and report generation. Depends on Backend's shared contract and persistence operations.

## 2. Backend work

### B1. Establish shared data and auth integration

- [ ] Start from the existing auth foundation. Preserve auth tables, provider configuration, HTTP routes, and the configured deployment.
- [ ] Agree shared validators/API shapes with Agent and Frontend. Add jobs, checklist templates, and checklist items with the agent state above. Use indexed queries for organization/job/item lookups.
- [ ] Install/configure the agreed Agent component and OpenAI dependencies with the Agent owner. Regenerate Convex bindings; keep shared file changes under one owner.
- [ ] Seed Agent's template catalog and fictional jobs without duplicate templates. Keep mutable jobs shared within their organization and inaccessible to other organizations.

### B2. Dispatch and persist item work

- [ ] Save confirmed intake, run extraction/selection, and persist the checklist before dispatching its items.
- [ ] Automatically schedule one item-agent action for every automated/third-party item. Exclude on-site items, and prevent duplicate thread creation or overlapping runs for an item.
- [ ] Provide internal context/result mutations scoped to the assigned item. Persist execution state, findings/drafts, missing information, next action, and errors so the frontend updates live.
- [ ] When the contractor supplies missing information or retries a failure, schedule only that item's agent using its existing thread. Waiting items must not require a continuously running action.
- [ ] Add draft review/editing, mark sent/received, and on-site completion mutations. Enforce the category/status rules and preserve human edits during agent updates.

### B3. Complete storage, reports, and deployment

- [ ] Support a short authenticated audio upload into Convex Storage and provide its storage ID to transcription. Keep uploads associated with the owning job.
- [ ] Persist the latest report; flag it as outdated when checklist contents change and allow regeneration.
- [ ] Configure OpenAI/Scribe keys and models on the intended Convex deployment. Reuse the existing Vercel deployment setup.
- [ ] Coordinate merges and preview deployments: PR #9's preview design shares one backend across previews, so incompatible branch deployments can affect teammates.

**Deliver:** typed API, schema/seed, automatic dispatch and resume, persisted progress, manual actions, and deployed backend. Backend coordinates integration.

## 3. Frontend work

### F1. Build intake within the existing authenticated app

- [ ] Preserve Google login and the auth provider/guards. Add job list, intake, checklist, and report routes under `/app` using the existing `src/routes.tsx` conventions.
- [ ] Reuse the existing Tailwind/UI components. Add address, job type, and pasted message fields.
- [ ] Add voice recording, upload/transcription feedback, and an editable transcript. Keep pasted text usable if recording fails.
- [ ] Submit confirmed intake once and open the resulting checklist.

### F2. Show each item's independent progress

- [ ] Subscribe to Convex job/item queries and render one generic checklist table: item, category, status, next action.
- [ ] Show each eligible item's agent activity independently: working, waiting, finished, or failed. One pending item must not block viewing other results.
- [ ] Add result viewing, missing-information input with resume, editable draft review/approval, mark sent/received, and retry for failed agent work.
- [ ] Show on-site items with manual completion and notes only. Do not provide agent execution controls for them.
- [ ] Label live/manual evidence and sample drafts, and make clear that submission/receipt buttons record actions performed outside the app.

### F3. Add the report and verify the PoC journey

- [ ] Display the saved report with generate/regenerate controls and an outdated notice after checklist changes.
- [ ] Verify the agreed desktop browser can complete intake, observe agents working, supply missing information, review a draft, record manual progress, and read a report.
- [ ] Keep loading/error feedback and labeled controls. Defer a cross-browser matrix, extensive responsive polish, and unrelated edge-case work.

**Deliver:** intake/voice UI, per-item progress and handoffs, manual on-site controls, and report view. Use typed fixtures while Backend's API is being built, then connect real Convex operations.

## Integration and PoC completion

1. Incorporate the auth foundation and merge the shared data/API contract first. Follow [the team workflow](Workflow.md) for scoped OpenSpec implementation tasks; use `npm run --silent openspec -- ...` for CLI commands.
2. Work separately in the three owned areas. Merge the first complete slice early: create job -> checklist -> independently processed items -> visible saved results.
3. Add waiting/resume, voice intake, and reporting on that shared foundation. Coordinate all schema, dependency, and preview deployment changes through Backend.
4. Run `npm run check`, `npm run build`, and Convex deployment validation. Check the integrated PoC on the actual judge-accessible URL with existing Google login.

The PoC is done when:

- [ ] Carpentry & Renovation and Electrical Work inputs produce different checklists, with a demonstrated message-triggered variation.
- [ ] Every eligible item gets its own sub-agent/thread; on-site items get none.
- [ ] Items progress independently, a waiting item resumes in the same context, and progress survives a page reload.
- [ ] Draft review and manual submission/receipt work; on-site completion remains human-controlled.
- [ ] Live voice transcription and report generation work, with evidence provenance clearly labeled.

These checks prove the agreed scope. Production hardening, broad browser coverage, and additional integrations are later work.
