---
name: ticket-handoff
description: Turn an agreed OpenSpec change into reviewable tickets with acceptance criteria, owners, and blockers. Use when the user asks to split a plan into issues or prepare an engineering handoff. Publish to GitHub only when authorized.
disable-model-invocation: true
---

# Ticket handoff

Prepare work that a teammate can pick up without the original chat. OpenSpec holds the requirements. Tickets track delivery and ownership. This skill drafts or publishes tickets; it does not implement the feature.

## Read the source

1. Read `AGENTS.md` and `openspec/config.yaml`. Run CLI examples using `npm run --silent openspec -- ...` from the repo root.
2. Use the change named by the user or established in the conversation. Otherwise run `npm run --silent openspec -- list --json`. If several changes could fit, ask which one. If no change exists, report that the handoff needs an OpenSpec proposal and offer the installed `openspec-propose` skill. Do not invent a plan.
3. Run `npm run --silent openspec -- status --change <name> --json`. Read the proposal, specs, design when present, and tasks from the returned artifact paths. Inspect the relevant code when needed to understand dependencies.
4. Confirm the scope is agreed from the user's request or earlier conversation. Do not ask again for approval already given. Surface any unresolved decision that would change a ticket's behavior or acceptance criteria before treating that ticket as ready.

## Draft the breakdown

Group tasks into small outcomes. An engineering ticket should deliver a complete behavior that can be tried, including the necessary UI and backend work. Do not create separate schema, API, and UI tickets by default. Follow real dependencies and keep the first useful demo small.

Business tickets describe a concrete deliverable, such as contractor feedback or approved checklist content. Their acceptance criteria describe that deliverable. Do not force business work into coding tasks.

Use the owners supplied by the user. Otherwise write `Unassigned`; do not guess a teammate or GitHub username. A blocker is work that must finish first, not merely related work. Identify shared files or contracts that need coordination without declaring all related work blocked.

Write the draft to `tickets.md` inside the selected OpenSpec change directory. If it exists, read it first and revise the existing breakdown. Preserve recorded issue URLs and IDs. Keep numbered ticket IDs stable and list blockers by ID and title. Do not mark implementation tasks complete because tickets were drafted or published.

Use this template for each ticket:

```markdown
## T1: <short outcome>

Type: Engineering | Business
Owner: <assigned owner or Unassigned>
Source: <proposal and relevant spec paths>
Tasks: <existing task IDs, or Not applicable for business work>
Blocked by: <ticket IDs and titles, or None>

### Outcome

<What will work or what deliverable will exist.>

### Acceptance criteria

- [ ] <Observable result or required deliverable.>

### Verification

<How the reviewer will check it. Reuse existing checks where relevant.>
```

Reference requirements instead of writing a competing spec. Carry the relevant acceptance scenarios into concise ticket criteria. Include only work within the agreed scope. Show the breakdown with owners and blockers, and ask for changes only where a decision remains open.

## Publish when requested

A request to draft or hand off is not permission to create GitHub issues. If publication is already authorized, proceed after preparing the concrete breakdown. Otherwise finish with the draft location.

1. Identify the GitHub repository from its remote and the user's request. Read existing issues to avoid creating duplicates for the same change and ticket. Do not modify an existing issue unless that is authorized.
2. Link to the proposal and specs at a pushed commit containing the agreed version. If those files are only local, report that publication needs reachable source files. Do not silently commit or push without authorization.
3. Create issues in dependency order. Use each ticket's outcome, source links, acceptance criteria, verification, and blockers as its body. Refer to already-created blockers by their issue URLs. Apply an assignee only when explicitly supplied and valid for that repository.
4. Use a structured tool argument or `gh issue create --body-file` to preserve the exact Markdown. If a call fails or its result is uncertain, inspect GitHub before retrying. Report partial publication and keep the URLs already returned.
5. Record each issue URL next to its ticket in `tickets.md`. Keep OpenSpec task checkboxes unchanged. Return the issue links and any remaining blockers.

Engineering uses `openspec-apply-change` for the selected change and authorized task scope. Completing one ticket does not authorize unrelated tickets. Nontechnical teammates review the agreed acceptance criteria and report whether the result meets them.
