# Site Ahead PoC roadmap

Build one working contractor journey with three owners: **Agent**, **Backend**, and **Frontend**. Focus on the scoped PoC in one agreed desktop browser. Keep the existing stack: Convex, React, Vite, Tailwind, OpenAI, and ElevenLabs Scribe.

Sources: [Idea, especially Step 4](Site-Ahead-Idea.md), [Architecture](Site-Ahead-Architecture.html), [checklist research](Job_Checklist_Research_Tradie.docx), and [request examples](Third_Party_Form_Examples.docx). Reuse the Google/Convex Auth and routing work from [PR #9](https://github.com/VinhLe1410/site-ahead/pull/9); incorporate its changes into the working base if not already present.

## Scope

- Contractor signs in, enters an address and job type, and pastes or records the client's message.
- The platform creates a tailored checklist for **Carpentry & Renovation** or **Electrical Work**.
- Each eligible checklist item gets its own sub-agent, which progresses that item independently.
- Contractors review drafts, manually record submission/receipt, and complete on-site checks.
- A report summarizes findings, pending work, and next actions.

Use fictional Ironbark Site Services jobs. Checklist evidence is seeded and labeled **Demo data**. OpenAI and ElevenLabs Scribe are live integrations. Defer other trades, live public-data APIs, email sending/watching, automatic portal submission, CRM, deadline automation, and voice Q&A.

## Agreed decision: one sub-agent per eligible checklist item

**After creating the checklist, automatically assign one logical sub-agent to each Automated Check and Third-Party Request item. Do not assign sub-agents to On-Site Checks.**

Each item has its own saved agent context and progress. Reuse specialist agent definitions across items, but keep each item's execution and conversation separate. An agent owns one item, not the entire checklist.

| Item category | Sub-agent responsibility | Human responsibility |
| --- | --- | --- |
| Automated Check | Read evidence through seeded-data/rule tools, interpret the result, and save the finding. | Resolve missing information or perform a manual check when automation cannot answer. |
| Third-Party Request | Prepare the request, identify missing information, and revise it when the contractor supplies that information. | Review/edit, submit externally, and manually record receipt or completion. |
| On-Site Check | No sub-agent execution. | Visit/check manually, add a note, and mark complete. |

**Progress does not require immediate completion.** An item may remain awaiting information, review, or a reply. The agent stops running while waiting; Convex saves its context. New contractor information or an explicit retry starts another run for that same item and context. Recording submission or receipt can update status directly without an unnecessary LLM call. There is no inbox polling in this PoC.

An item's agent finishing a run does not mean the checklist item is done. In particular, a prepared request is not a received reply, approval, or site clearance. If an Automated Check cannot be answered, retain its reason and move it to an On-Site Check; stop automatic processing for that item.

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
| Job | Owner, address, job type, confirmed intake text, extracted subtype/triggers, latest report. |
| Checklist template | Stable key, trade, category, title, base/trigger condition, tool or request kind. |
| Checklist item | Job/template IDs, category, status, finding or draft, missing information, human notes, next action. |
| Item agent state | Item ID, Agent thread ID, latest run ID, execution state, error. Store on the item if sufficient; thread history lives in the Agent component. |

Use `automated`, `third_party`, and `on_site` as category values. Keep **item status** separate from **agent execution state**:

- Automated: `pending -> done`, or transfer to an unfinished on-site check.
- Third-party: `not_started -> drafting -> ready_to_send -> pending -> done`. Keep missing information/review visible while drafting. Contractor approval makes it ready; manual submission makes it pending; manual receipt/completion makes it done.
- On-site: `not_started -> done` through a contractor action.
- Agent execution: `idle`, `running`, `waiting`, `finished`, or `failed`. On-site items have no active agent.

Backend exposes typed operations for creating/reading jobs, starting checklist preparation, reading items, providing item information/resuming its agent, saving/approving drafts, marking sent/received, completing on-site work, audio intake, and generating reports. Agent uses internal operations to read its assigned context and save progress/results. Frontend uses the generated Convex API.

Preserve existing authentication and check job ownership on domain operations. Keep provider keys server-side. Prevent duplicate agents for the same item and overlapping runs; retries must reuse the item's thread and preserve contractor edits. Validate statuses and model output on the server.

## 1. Agent work

### A1. Set up agent observability

- [ ] Add a shared observability helper (e.g. `convex/agents/shared/observability.ts`) providing `rawRequestResponseHandler`, `contextHandler`, and `usageHandler` for every Agent instance, per @convex-dev/agent's documented debugging and usage-tracking hooks.
- [ ] Enable `experimental_telemetry` on every agent generate/stream call so OpenTelemetry spans (model, tokens, prompt, response) export to Langfuse Cloud via its OTLP endpoint. New env vars: `LANGFUSE_HOST`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`. Coordinate the new dependency and env var additions with Backend — dependency/configuration changes are Backend's per the shared contract above.
- [ ] Confirm every item-agent action declares the Node.js runtime (`"use node"`), required by the OpenTelemetry exporter package.
- [ ] Verify with one smoke-test call that a trace reaches Langfuse before wiring this into the real Evidence/Request agents (now A3, see below).

### A2. Classify checklist items into resolution categories

- [ ] Take the job's resolved checklist as input — for now, simulate this as if provided by Backend, since real checklist retrieval/persistence isn't wired up yet.
- [ ] Classify each checklist item into exactly one of three defined categories: Automated Check, Third-Party Request, or On-Site Check.

### A3. Implement the item sub-agents

#### A3.1. Wire up live API checks for Automated Check items

- [ ] For each Automated Check item that needs an external data source, identify and select the appropriate API for that specific task (e.g. EPA Victoria AirWatch for an air-quality check).
- [ ] Call the selected API and receive a response in the expected format.

Success criteria:

- [ ] Able to choose the API that matches the task.
- [ ] Request to the API succeeds and returns a correctly-formatted response.

- [ ] Define reusable Evidence and Request agents with OpenAI, focused instructions, and item-specific tools.
- [ ] For each eligible item, create its Agent thread once, save the association, and run the agent with the job context and assigned item. Skip on-site items entirely.
- [ ] Evidence tools return seeded responses or deterministic rule results. Save the finding and its provenance; unknown answers remain unresolved or become on-site checks.
- [ ] Request agents draft trade-specific field summaries, LEI booking emails, and conditional carpentry permit enquiries. Follow the request examples; leave missing names, dates, licence details, and contacts for the contractor.
- [ ] Save the next action and stop when waiting for information/review/reply. Resume the same item's thread when Backend schedules a new run after information or retry. Do not overwrite approved/submitted drafts or automatically send requests.

### A4. Add voice intake and reporting

- [ ] Transcribe stored audio through ElevenLabs Scribe; return editable text to the intake screen. Confirmed text enters the same extraction path as pasted text.
- [ ] Generate a short report from saved checklist state, including completed findings, pending requests, manual checks, and next actions. Label seeded evidence and do not assume pending work is complete.
- [ ] Verify two different trade checklists, one message-triggered variation, and one waiting item that resumes after new information.

**Deliver:** item-category classification, observability scaffolding, per-item agents/tools, transcription, and report generation. Depends on Backend's shared contract and persistence operations.

## 2. Backend work

### B1. Establish shared data and auth integration

- [ ] Start from the existing auth foundation. Preserve auth tables, provider configuration, HTTP routes, and the configured deployment.
- [ ] Agree shared validators/API shapes with Agent and Frontend. Add jobs, checklist templates, and checklist items with the agent state above. Use indexed queries for owner/job lookups.
- [ ] Install/configure the agreed Agent component and OpenAI dependencies with the Agent owner. Regenerate Convex bindings; keep shared file changes under one owner.
- [ ] Seed Agent's template catalog and fictional jobs without duplicate templates. Keep each contractor's mutable jobs private.

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
- [ ] Label seeded results and make clear that submission/receipt buttons record actions performed outside the app.

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
- [ ] Live voice transcription and report generation work, with seeded evidence clearly labeled.

These checks prove the agreed scope. Production hardening, broad browser coverage, and additional integrations are later work.
