# Site Ahead

A pre-visit site recon agent for contractors. Contractor-only platform (client never logs in, only receives drafted messages). Input: an address and a job type. Output: a live, job-specific checklist that resolves itself through three different paths depending on what kind of information each item needs, plus a synthesised pre-visit report.

There is no single fixed checklist. Excavation work, electrical work, and a renovation job each need a genuinely different set of checks — Site Ahead's job is to generate the right checklist for whatever job type comes in, then work through it. The engine is job-agnostic; only the checklist content changes per job.

## The problem, in your words

Contractors (and the companies that provide contracting services) currently have to visit a site, sometimes multiple times, to learn things they could mostly know in advance, and every job type requires checking something different: traffic and what's underground for a civil job, certificate and inspection status for an electrical job, permit thresholds and asbestos risk for a renovation. Each trip, and each manually-remembered checklist, is something that doesn't need a body on-site or a good memory to get right.

## Why this niche holds up ("go where nobody is looking")

Checked the obvious "site intelligence" players: TraceAir, OpenSpace, and Sensera's SiteCloud are all real, funded products, but they're aimed at _during-construction_ visual monitoring (drone/360-camera progress capture, earthworks tracking) for homebuilders and large builders, not _pre-visit_ due diligence for a contractor deciding what they're walking into before they've even quoted or mobilised. Didn't find a product that consolidates "everything you'd want to know and do before you drive out there" into one report, for any trade. Treat this as "not found," not "confirmed absent" — worth a 2-minute sanity check with a contractor if possible.

## The core mechanism: a checklist that resolves itself three ways

Every job type needs a different checklist, and every checklist item needs a different kind of effort to resolve. Rather than treating the checklist as one flat list, Site Ahead sorts every item into exactly one of three categories the moment a job is created:

1. **Automated Checks** — resolved instantly, either from a live API/public data source, or from a simple internal rule (a job-value threshold, a job-type classification). No one has to do anything; the agent resolves it and the item is done.
2. **Third-Party Requests** — the answer or approval lives with an external body (an asset owner, a council, a regulator, an inspector) and has to be formally requested. Site Ahead drafts the form or enquiry, the contractor reviews and sends it, and Site Ahead tracks it until a reply closes the loop.
3. **On-Site Checks** — nothing external can answer this. It needs a person's judgement, either at the site or on the paperwork only they can complete. Site Ahead doesn't pretend otherwise; it just tracks that the check still needs doing.

This replaces a flat "further investigation needed" list with something more useful: every item has an owner and a next action. If an Automated Check's data source ever fails, that item falls through to an On-Site Check rather than silently disappearing.

### Status flow per category

**Automated Checks** `Pending` → `Done` (with a "View Result" action showing the retrieved data or the applied rule). Falls through to an On-Site Check if a live data source fails.

**Third-Party Requests** `Not Started` → `Drafting` (Site Ahead has prepared the form/enquiry) → `Ready to Send` (contractor has reviewed and can edit the draft) → `Pending` (contractor has manually submitted it, never automatic) → `Done` (a matching reply arrived and closed it out). Flagged `Overdue` if a known response window passes without a reply (e.g. BYDA's ~2 business days, a road-reserve permit's ~20 business days, an electrical inspection's 8-business-day requirement). Site Ahead never sends anything on its own — drafting is automatic, sending is always a human action.

**On-Site Checks** `Not Started` → `Done`, ticked manually by whoever completes it, with an optional note.

## Checklist library by job type

Same three categories, four different job types, to show the checklist genuinely changes shape while the engine doesn't. (Full source detail for the trade items is in `track_construction_job_checklists_research.md`.)

**Excavation & Trenching (civil)**

| # | Checklist item | Category | Status | Action |
| --- | --- | --- | --- | --- |
| 1 | Traffic conditions & nearby road disruptions | Automated Check | Done | View Result |
| 2 | Air quality reading | Automated Check | Done | View Result |
| 3 | Road-reserve / permit likely required (flag) | Automated Check | Done | View Result |
| 4 | Underground services clearance (BYDA) | Third-Party Request | Pending | Track Reply |
| 5 | Traffic Management Plan / road occupancy permit | Third-Party Request | Drafting | Review Draft |
| 6 | Dust management plan need (sensitive receptor nearby) | On-Site Check | Not Started | Mark Complete |

**Electrical Work**

| # | Checklist item | Category | Status | Action |
| --- | --- | --- | --- | --- |
| 1 | Work classified prescribed vs non-prescribed | Automated Check | Done | View Result |
| 2 | Certificate of Electrical Safety (CES) prepared | On-Site Check | Not Started | Mark Complete |
| 3 | Independent inspection booked (if prescribed, 8-business-day window) | Third-Party Request | Pending | Track Reply |
| 4 | Safety switch (RCD) coverage confirmed | On-Site Check | Not Started | Mark Complete |

**Plumbing Work**

| # | Checklist item | Category | Status | Action |
| --- | --- | --- | --- | --- |
| 1 | Licence class matches work type | Automated Check | Done | View Result |
| 2 | Job value vs $750 compliance-certificate threshold | Automated Check | Done | View Result |
| 3 | Compliance Certificate lodged with the Building and Plumbing Commission | Third-Party Request | Drafting | Review Draft |
| 4 | Notifiable-work determination (certificate vs full permit) | On-Site Check | Not Started | Mark Complete |

**Carpentry & Renovation**

| # | Checklist item | Category | Status | Action |
| --- | --- | --- | --- | --- |
| 1 | Construction year (pre/post 1990) | Automated Check | Done | View Result |
| 2 | Job value vs $10k / $16k thresholds | Automated Check | Done | View Result |
| 3 | Certificate of Consent from the Building and Plumbing Commission (if >$16k) | Third-Party Request | Not Started | Prepare Draft |
| 4 | Building permit + registered surveyor appointed | Third-Party Request | Pending | Track Reply |
| 5 | Asbestos disturbance assessment | On-Site Check | Not Started | Mark Complete |
| 6 | Occupancy Permit / Certificate of Final Inspection on completion | Third-Party Request | Not Started | Prepare Draft |

The pattern holds across all four: certificates, consents, and permits are Third-Party Requests; thresholds and classifications are Automated Checks; anything needing a person's eyes or a professional's own paperwork is an On-Site Check. This is what "different checklist per job" means in practice — not a different UI, the same table with different rows.

## Tailoring the checklist from client communication

Job type alone isn't the whole picture — two carpentry clients can describe completely different work. Site Ahead accepts the client's own words as an intake input, in whichever form is easiest to capture them in:

- **Paste the chat/SMS** — a text box for dropping in the client conversation as-is.
- **Speak it** — a voice recording transcribed to text via ElevenLabs Scribe (speech-to-text), for when reading it aloud is faster than pasting it. This is a genuine ElevenLabs API integration, so it also qualifies the build for the ElevenLabs bonus track alongside the main track.

Both paths converge on plain text, which feeds one LLM extraction call: it picks a job subtype from a small fixed list per trade, and flags which of a short list of known trigger phrases are present (e.g. "near the back fence" → boundary/easement check, "house is from the 70s" → pre-1990 asbestos assumption). The base checklist for the job type gets extended with whichever extra items those triggers point to. This is a classification task, not open-ended understanding — it's bounded by the same checklist library already defined, just with items now tagged with what should trigger them.

Example: two clients both say "carpentry job." One writes "extending the back deck, house is from the 70s, right up near the back fence" — the extraction flags outdoor structural work, a pre-1990 property, and boundary proximity, so the checklist gains the asbestos-assumption item and a boundary check on top of the base Carpentry & Renovation list. The other writes "just replacing some rotted skirting boards inside" — no triggers fire, and they get the bare base checklist. Same job type, genuinely different lists, driven by what the client actually said.

This covers a chat transcript or voice message provided for a specific job at intake time, not live SMS/Gmail ingestion — that stays out of scope, as noted in Step 4.

## Step 1: The concrete problem

A contractor (or their office) gets a new job at an address. Before quoting or sending a crew, someone needs to work through a checklist that depends entirely on what kind of job it is: traffic, access, and underground services for a civil job; certification and inspection timing for an electrical job; permit thresholds and asbestos risk for a renovation. Today that checklist lives in someone's head or habit, gets applied inconsistently between staff, and nothing tracks which items are actually resolved versus just assumed fine.

## Step 2: Current process vs Site Ahead

There isn't one process — that's the point. The current manual process is really "whatever the experienced person on staff remembers to check for this kind of job," and it changes completely depending on the job type. Site Ahead's process changes the same way: same intake, same three categories, completely different generated checklist.

**Example: an excavation/trenching job comes in**

1. Address + job type ("excavation") entered.
2. Site Ahead generates the civil checklist: traffic, air quality, and permit-likely flag resolve immediately as Automated Checks.
3. BYDA enquiry and the road-reserve permit are drafted as Third-Party Requests and sent for review.
4. Dust-management-plan need is flagged as an On-Site Check.
5. Contractor sees one table: three items done, two pending replies, one to check in person.

**Example: an electrical job comes in for the same address**

1. Address + job type ("electrical — switchboard upgrade") entered.
2. Site Ahead generates a completely different checklist: prescribed-work classification resolves immediately as an Automated Check.
3. Because it's prescribed, an inspection booking is drafted as a Third-Party Request with an 8-business-day deadline attached.
4. CES preparation and RCD coverage are flagged as On-Site Checks — nothing external to chase, just paperwork and a physical check the electrician does themselves.
5. Contractor sees a table with a different shape entirely: one done, one pending, two on-site — for the same address as the excavation example above.

Same address, same three categories, two unrecognisably different checklists. That's the flexibility the engine has to support, and it's a data problem (which items, in which category, for which job type), not a UI problem — the table and the status logic stay identical.

## Step 3: Quantify the value (illustrative — validate before locking into the pitch)

**Floor: research/admin time saved (civil example).**

- Assume a small-to-mid civil/commercial contractor assesses ~8 new jobs/tenders a month (96/year) that would normally get a manual pre-visit check.
- Assume ~2 hours per job today: roughly 1 hour of manual lookups across council/EPA/VicRoads/Maps plus lodging a BYDA enquiry, and ~1 hour for a drive-by look.
- Assume Site Ahead cuts that to ~20 minutes of review, saving ~1.7 hours/job.
- At $65/hr loaded estimator/supervisor cost: **1.7 hrs × 96 jobs × $65 ≈ $10,600/year** in reclaimed time for one contractor doing this one job type. The same shape of calculation applies per job type/vertical the tool is configured for; this is the clearest one to quote since it has the most sourced detail behind it.

**Upside: avoided utility-strike exposure — this one has real numbers behind it.** Underground utility strikes cost Australia an estimated **$4.6 billion a year** in direct and indirect damage, with **15,000+ strikes annually** and civil construction the single largest cause (~2,700 of ~5,100 NSW incidents in the underlying study). The same research found total cost runs roughly **29× the direct repair figure** — a $10,000 repair becomes ~$290,000 once standby crew/plant, liquidated-damages delay costs, service-interruption claims and insurance impacts are counted. The honest framing: "surfacing the BYDA lodgement and tracking it to completion before mobilisation, instead of losing track of it after someone's already digging, is exactly the kind of gap this national data says is worth closing."

**Validate before building:** a 5-minute conversation with a contractor on real job volume and how much manual pre-visit checking actually happens would make both numbers far more defensible.

## Step 4: Current implementation scope

The broader examples above describe the product vision. The authorized `add-checklist-item-agents` change proves independent checklist processing for Carpentry & Renovation on the existing Convex, React, Vite, and Tailwind app. It supersedes the earlier seeded-evidence demo plan and automatic fallthrough to on-site work for this change. Electrical Work, intake extraction, voice, reporting, submission/receipt tracking, and additional trade flows remain separate roadmap work. The user's later demo feedback includes a live Job Brief derived from saved checklist results, with suggested next actions in priority order and the original input still accessible, plus individual saved road-disruption details. This small summary view does not add the broader generated/persisted report workflow.

1. Automatically start from full checklist records saved by job creation, with explicit start controls for existing jobs. Classify pending items and preserve completed items. Invalid or missing classifications preserve the previous kind and show a failure; they do not silently become on-site checks.
2. Give each successfully classified automated or third-party item one persistent Convex Agent thread, with independent bounded execution and same-thread retry. On-site items remain human-only. Checklist status stays `pending | done`; execution progress is stored separately.
3. Use live DataVic construction-year, EPA AirWatch air-quality, and Transport Victoria road-closure checks. Only validated evidence relevant to the saved job can complete an automated item. Missing location or coverage remains pending with a reason; API or validation errors remain visible failures. Powerlines is excluded.
4. Try DataVic first for construction year. A successful exact-address miss or matching record without a year permits an available contractor-confirmed year from the same saved job, validated as an integer from 1800 through the current UTC year. Record the supplying member, time, and manual provenance. Live valid data wins; API or validation failure never activates fallback. Neither source means unresolved and pending.
5. Use exactly two form-specific runtime skills for the uploaded Building Permit — Carpentry PDF and Occupancy Permit — Carpentry DOCX, selected by a GPT-5.5 Request Agent. Load item-pinned source versions from the organization document library. Fill the actual saved job address and confirmed details, supplement missing general fields with a consistent fictional demo profile, and identify those values as demo data. Leave signatures, signing dates, declarations and approval/certificate references blank for human confirmation. Save a new clearly labeled demo draft without changing its source, then wait for the contractor; never send or submit anything.
6. Provide authenticated organization members controls to start processing, retry one item, supply missing data, inspect results, and download drafts. Preserve manual completion and notes, organization isolation, and human changes during a run.

The existing organization, job, category, and versioned document foundations are reused. There is no parallel form/blob catalog. Provider secrets remain server-side, and structured logs and Langfuse traces expose stages and failures without logging document contents or credentials.

## Step 5: Where AI actually helps

- Speech-to-text: ElevenLabs Scribe turning a spoken client message into text, as an alternative to pasting a chat transcript.
- Extraction: job subtype and trigger-keyword detection from that text (pasted or transcribed), used to tailor which checklist items apply beyond the job-type base list.
- Classification: sorting each checklist item into the right category (Automated / Third-Party / On-Site), and generating the right set of items for a given job type.
- Multi-source retrieval and synthesis: pulling from live APIs and turning results into a coherent, readable brief.
- Drafting: the BYDA enquiry, the inspection booking request, the compliance certificate submission text, the final report narrative.
- (Roadmap, not this build) Email parsing to match an inbound reply to the right outstanding request automatically.
- (Roadmap, not this build) Voice Q&A over the generated report — a different feature from the Scribe intake above, which only handles input, not answering questions back.

## Step 6: The judge-facing story

Problem: contractors need a different checklist for every job, not just every job type, and today that checklist lives in someone's memory, gets applied inconsistently, and nothing tracks what's actually resolved versus assumed fine. Current cost: roughly $10,600/year in reclaimed admin time for one mid-size contractor on just one job type (illustrative floor, to validate), against a backdrop where underground utility strikes alone cost Australia $4.6B/year. Our solution: enter an address and a job type, or paste/speak the actual client conversation, and get a checklist built for that exact job — tailored further by what the client actually said, some items resolved instantly, some drafted and sent off for tracking, and an honest list of what still needs a person. Result: the same engine handles a trenching job and an electrical job with completely different checklists, and two carpentry clients with different checklists too, without anyone having to remember what each one requires. Cost to run: free public APIs plus cents of LLM cost per report; the voice intake also qualifies the build for the ElevenLabs bonus track.

## Sources checked

- [TraceAir: Site Intelligence for Homebuilders and Land Developers](https://www.traceair.net/)
- [OpenSpace: Visual Intelligence Platform for Builders](https://www.openspace.ai/)
- [Sensera Systems SiteCloud jobsite intelligence](https://www.businesswire.com/news/home/20250429767322/en/Sensera-Systems-Continues-to-Scale-Jobsite-Intelligence-with-AI-powered-SiteCloud-Search)
- [EPA Victoria: Environment Monitoring API (DataVic)](https://discover.data.vic.gov.au/dataset/environment-monitoring-api)
- [EPA Victoria: AirWatch](https://www.epa.vic.gov.au/for-community/airwatch)
- [Transport Victoria Open Data: Planned Disruptions - Road](https://opendata.transport.vic.gov.au/dataset/planned-disruptions-road)
- [Transport Victoria Open Data: Unplanned Disruptions - Road](https://opendata.transport.vic.gov.au/dataset/unplanned-disruptions-road)
- [Before You Dig Australia (BYDA): FAQs](https://www.byda.com.au/faqs/)
- [Smartscan Locators: The True Cost of an Underground Utility Strike on a NSW Civil Project](https://www.smartscanlocators.com.au/the-true-cost-of-an-underground-utility-strike-on-a-nsw-civil-project/)
- [Transport Victoria: Working within the road reserve](https://transport.vic.gov.au/road-and-active-transport/business/road-and-traffic-management/road-permits-and-charges/working-within-the-road-reserve)
- [City of Casey: Working within road reserve permit](https://www.casey.vic.gov.au/apply-working-within-road-reserve-permit)
- Electrical/Plumbing/Renovation checklist detail and sources: see `track_construction_job_checklists_research.md`
- [ElevenLabs: Scribe (speech-to-text)](https://elevenlabs.io/speech-to-text)
