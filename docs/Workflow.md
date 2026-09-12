# Team workflow

Use OpenSpec to turn an idea into a small scope, a plan, and tasks a coding agent can follow. The workflow and plans live in this repo so another teammate can continue the work.

## First use

1. Install Node.js 24 or newer and clone the repo.
2. Run `npm ci` in the repo folder.
3. Open that folder in Codex or Claude Code with your own account. Restart an existing agent session to load the new skills.
4. Start with `$grill-me` in Codex or `/grill-me` in Claude Code, followed by your idea.

OpenSpec 1.13.0 is pinned in `package.json` and `package-lock.json`. It requires Node.js 20.19 or newer, which this project's Node.js 24 requirement satisfies. The generated skills are included in the repo. Teammates do not need to run OpenSpec initialization or install it globally.

Planning can start without running the app. Building and checking Convex changes also requires the app setup described in [README.md](../README.md).

Nontechnical teammates define and review the behavior, then hand off. Engineering reviews the technical design, assigns tickets, and directs implementation.

## Scope an idea

Paste this into your agent chat and replace the feature description:

> Use grill-me to help me scope the contractor intake screen. Read our project context first. Ask short questions about the user, behavior, exclusions, and how we'll know it works. We are planning only.

Then ask for the plan:

> Use OpenSpec propose to turn our agreed scope into a change named contractor-intake. Include observable acceptance scenarios and small coding tasks ordered by dependency. Stop after writing the plan so I can review it.

The agent writes `proposal.md`, requirements under `specs/`, `tasks.md`, and a `design.md` when the change needs technical design, inside `openspec/changes/contractor-intake/`.

Review the proposal and scenarios. Check that they describe the outcome you want and exclude work you do not want. Ask the agent to revise anything unclear before handing it off.

## Hand off approved work

Use `$ticket-handoff contractor-intake` in Codex or `/ticket-handoff contractor-intake` in Claude Code. Or paste:

> Use ticket-handoff to split the approved contractor-intake plan into small tickets. Include acceptance criteria and blockers. Leave owners unassigned unless we've chosen them. Save the draft for engineering to review.

The skill saves `tickets.md` inside `openspec/changes/contractor-intake/`. Engineering tickets describe working behavior. Business tickets describe deliverables such as contractor feedback or approved checklist content. Both link to the agreed proposal.

Engineering reviews the breakdown and assigns owners. To publish, ask `ticket-handoff` to create the approved GitHub issues. The proposal must be committed and pushed so each issue can link to it. The skill records the issue URLs in the draft. Drafting tickets does not publish issues or mark coding tasks complete.

## Build and review

Engineering can direct the agent with:

> Use OpenSpec apply for contractor-intake. Implement only the tasks covered by [ticket ID or issue URL]. Read the linked requirements, keep task checkboxes current, run the required checks, and explain how to try the result.

Share the branch containing the change folder so the next teammate can continue from the same plan. Commit specs and code together as implementation progresses. Agree who owns each ticket before two agents edit the same files. The teammate who requested the feature reviews the result against its acceptance criteria.

To adjust an existing plan, ask the agent to use OpenSpec update for that change and describe the adjustment. When the result works and its tasks are complete, ask the agent to use OpenSpec archive. This moves the change into `openspec/changes/archive/` and merges its requirements into `openspec/specs/`.

## Explicit commands

Type these in agent chat, not in the terminal. Plain-language requests above work too.

| Action | Codex | Claude Code |
| --- | --- | --- |
| Clarify an idea through questions | `$grill-me` | `/grill-me` |
| Explore an idea | `$openspec-explore` | `/opsx:explore` |
| Write a proposal and tasks | `$openspec-propose` | `/opsx:propose` |
| Draft or publish a ticket handoff | `$ticket-handoff` | `/ticket-handoff` |
| Revise a change | `$openspec-update-change` | `/opsx:update` |
| Implement a change | `$openspec-apply-change` | `/opsx:apply` |
| Archive completed work | `$openspec-archive-change` | `/opsx:archive` |

Append the change name when continuing existing work.

## Check and maintain the workflow

Run these in the terminal from the repo root:

```sh
npm run openspec -- --version
npm run openspec -- list
npm run openspec:check
```

`npm run check` includes OpenSpec validation alongside TypeScript, lint, and formatting. CI runs the same checks. OpenSpec validation checks document structure; verify the app against the acceptance scenarios too.

Agents must run CLI examples written as `openspec ...` using `npm run --silent openspec -- ...`. This uses the pinned local executable and keeps JSON output readable by agents.

To add another supported coding tool, use the pinned CLI, for example:

```sh
npm run openspec -- init --tools cursor --profile core
```

Commit the generated integration files so teammates using that tool inherit them. Keep project-specific instructions in `AGENTS.md` and `openspec/config.yaml`; generated skills and commands can be overwritten by OpenSpec.

`grill-me` and `ticket-handoff` are team-owned skills, maintained directly in this repo. `grill-me` reuses the developer's existing interview skill with project context and an OpenSpec handoff. `ticket-handoff` defines this team's ticket workflow. They are not installed from Matt Pocock's skill collection and have no dependencies on it. Edit their canonical `SKILL.md` files in `.agents/skills/`; `.claude/skills/` contains relative directory symlinks to those copies. They do not have external-source entries in `skills-lock.json`, which tracks the installed Convex skills.

For a deliberate upgrade, install an exact version with `npm install --save-dev --save-exact @fission-ai/openspec@<version>`, then regenerate the configured integrations with `npm run openspec -- init --tools codex,claude --profile core`. Include any additional tools the team has adopted. Review the generated changes, run `npm run check`, and commit the dependency, lockfile, and integrations together.

References: [OpenSpec setup](https://openspec.dev/docs/setup), [project configuration](https://openspec.dev/docs/project-config), and [supported tools](https://openspec.dev/docs/supported-tools).
