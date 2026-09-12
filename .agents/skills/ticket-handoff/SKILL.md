---
name: ticket-handoff
description: Turn agreed grilling decisions and existing project context into one or more actionable issues for engineering or business work. Use when the user asks to turn an idea or discussion into issues or prepare a handoff. Publish to GitHub only when authorized.
disable-model-invocation: true
---

# Ticket handoff

Read the project's existing knowledge, clarify the intended outcome, and prepare issues another teammate can pick up without the original chat. Engineering creates an OpenSpec change with design and tasks after picking up an issue. This skill does not require or create that change, and it does not implement the feature.

## Read existing context

1. Read `AGENTS.md` and `openspec/config.yaml`. Run CLI examples using `npm run --silent openspec -- ...` from the repo root.
2. Run `npm run --silent openspec -- list --specs` and `npm run --silent openspec -- list --json`. Read relevant existing specs in full. Inspect related active changes with `npm run --silent openspec -- status --change <name> --json` and read their returned artifact paths to avoid duplicating planned work. Empty spec or change lists do not block the handoff.
3. Inventory the available project documents with `rg --files docs` and follow relevant links in the README and project instructions. Read the documents that inform the request, including product notes, architecture, research, and prior decisions. Use suitable readers for relevant non-Markdown documents. Inspect relevant code to distinguish implemented behavior from intended behavior. Report material sources you cannot read.
4. Read the user's request and agreed decisions from the grilling discussion. Do not ask the user to repeat facts already available in the repo or conversation. Existing specs describe the starting point; a proposed change may intentionally alter them. Record that difference explicitly. Surface conflicts between documents and the discussion rather than silently choosing one.

## Settle the outcome

If the user, problem, scope, or acceptance criteria remain unclear, use the installed `grill-me` skill to resolve those decisions. Resume from what is already agreed. Stop clarifying when there is enough context to describe actionable work; do not require engineering design, task lists, or answers to unrelated questions.

The user owns the decisions. Preserve approval already given, and do not treat unanswered questions as agreement. If an unresolved question blocks implementation, either resolve it with the user or describe a bounded research or decision issue when that work is within the authorized scope. Downstream issues remain blocked until it is resolved. Record nonblocking questions for engineering to settle during design.

## Draft one issue or several

Default to one issue for one coherent outcome. Split only when there are distinct deliverables, different owners, real dependencies, or too much work to review as one outcome. Explain the reason for a split. Do not create a fixed number of tickets or a ticket for every interview question.

Engineering issues describe small, complete behaviors that can be tried. Do not split by schema, API, and UI layers by default. Business issues describe deliverables such as contractor feedback or approved checklist content. Research issues state the question and the evidence needed to resolve it. Keep all issues within the agreed scope.

Use owners supplied by the user, otherwise write `Unassigned`. Do not guess a teammate or GitHub username. A blocker is work that must finish first, not merely related work.

Save the draft at the user-specified path or `docs/handoffs/<topic>.md`. Read and revise an existing draft for the same topic rather than creating a duplicate. Preserve ticket IDs and recorded issue URLs. This draft is independent of any OpenSpec change directory.

Use this template for each issue:

```markdown
## T1: <short outcome>

Type: Engineering | Business | Research
Owner: <assigned owner or Unassigned>
Context: <relevant existing specs and project documents>
Blocked by: <ticket IDs and titles, or None>

### Problem

<Who needs this and what is missing or difficult today.>

### Agreed outcome

<What should work or what deliverable should exist, including decisions from grilling.>

### Out of scope

<Explicit exclusions.>

### Acceptance criteria

- [ ] <Observable result or required deliverable.>

### Open questions

<Remaining questions and whether they block work, or None.>
```

Capture enough agreed context in each issue for a teammate with no chat history. Reference the existing documents and explain what would change; do not write a technical design or implementation task list. Review the proposed issue or breakdown with the user if scope is not yet approved. Drafting issues never marks implementation work complete.

## Publish when requested

A request to draft or hand off is not permission to create GitHub issues. If publication is already authorized, proceed once the issue contents are ready. Otherwise finish with the draft location.

1. Identify the GitHub repository from its remote and the user's request. Read existing issues to avoid duplicates for the same work. Do not modify existing issues unless authorized.
2. Link to existing specs and documents at a pushed commit when available. For local-only sources, name the path and capture the relevant decisions in the issue body. Do not invent a reachable link or require a new OpenSpec change, commit, or push to publish the issue.
3. Create issues in dependency order. Replace draft blocker IDs with the URLs of already-created issues. Apply an assignee only when explicitly supplied and valid for that repository.
4. Use a structured tool argument or `gh issue create --body-file` to preserve the exact Markdown. If a call fails or its result is uncertain, inspect GitHub before retrying. Report partial publication and keep the URLs already returned.
5. Record each issue URL beside its ticket in the draft. Return the issue links and any remaining blockers.

Engineering reads the picked-up issue and its linked context, then uses `openspec-propose` to create a scoped change with requirements, design when needed, and tasks. It uses `openspec-apply-change` when implementation is authorized. One issue or several closely related issues may feed a change; engineering chooses that boundary and links the source issues. Nontechnical teammates review the result against the issue's acceptance criteria.
