# Team workflow

Read existing specs and project documents, grill the idea, create one or more GitHub issues, then let engineering turn the issues into an OpenSpec change and implement it.

Nontechnical teammates define and review behavior. Engineering owns technical design and implementation tasks.

## First use

1. Install Node.js 24 or newer and clone the repo.
2. Run `npm ci` in the repo folder.
3. Open that folder in Codex or Claude Code with your own account. Restart an existing agent session to load the skills.
4. Start with `$grill-me` in Codex or `/grill-me` in Claude Code, followed by your idea.

OpenSpec 1.13.0 is pinned in the project. The shared skills are included in the repo, so teammates do not need to initialize OpenSpec or install it globally. Planning can start without running the app. Building and checking Convex changes requires the app setup in [README.md](../README.md).

## Read context and clarify the idea

Paste this into agent chat and replace the feature description:

> Use grill-me to help me define the contractor intake screen. Read existing OpenSpec specs and the available project documents first. Check what already works and what is already planned. Ask short questions about the user, behavior, exclusions, and how we'll know it works. We are preparing work for engineering, not designing the implementation.

The skill reads relevant specs, active changes, product notes, architecture, research, and code before asking questions. It uses the documents that inform the idea and surfaces conflicts. Having no existing specs or changes does not block this step.

Stop when the outcome and scope are clear enough to describe actionable work. Technical design and coding tasks can wait for engineering.

## Create one issue or several

Use `$ticket-handoff` in Codex or `/ticket-handoff` in Claude Code after the discussion. For example:

> Use ticket-handoff to draft an issue from our agreed discussion and project documents. Split it into multiple issues only if the work needs separate outcomes, owners, or dependencies. Include acceptance criteria, exclusions, and remaining questions. Leave owners unassigned unless we've chosen them.

The skill saves the draft in `docs/handoffs/<topic>.md`, independently of OpenSpec changes. One coherent outcome normally needs one issue. Larger work can become several linked issues. Engineering issues describe working behavior, business issues describe deliverables, and research issues describe questions and the evidence needed to answer them.

Review the proposed issue or breakdown, then publish it with:

> Create the GitHub issues from this approved draft and record their links. Include links to the existing specs and documents that informed the discussion.

A request to create issues already authorizes publication; asking only for a draft does not. The issue body includes the agreed decisions so engineering does not need the original chat. Local-only source documents do not prevent publication, and no new OpenSpec change is required.

## Engineering plans and builds

An engineer picks up an issue, reads it and its linked context, and asks:

> Use OpenSpec propose to turn [issue URL] into a scoped change. Read the existing specs, relevant project documents, and code. Link the source issue and include requirements, technical design where needed, and implementation tasks. Preserve the issue's agreed scope and acceptance criteria.

Review specs for user outcomes, business rules, user flows, required information, and relevant error states. Check requirements and scenarios for presentation details that can change without affecting the required outcome. For example, specify that users can see and remove each active filter; leave the choice of chips to design notes or implementation. Layout, positioning, styling, and component choices belong in specs only when they are explicit acceptance constraints, with a reason. Keep accessibility and interactions that affect the outcome in specs.

These rules live under `rules.specs` in `openspec/config.yaml`, following OpenSpec's [spec guidance](https://github.com/Fission-AI/OpenSpec/blob/v1.13.0/schemas/spec-driven/schema.yaml) and [project configuration](https://openspec.dev/docs/project-config). They guide generation and review. Structural validation does not enforce this distinction.

Engineering chooses whether one issue or several closely related issues belong in a change. It reviews the technical plan, resolves remaining design questions, and directs implementation:

> Use OpenSpec apply to implement [change name]. Follow the agreed scope, keep task checkboxes current, run the required checks, and explain how to try the result.

Share the branch containing the change so another engineer can continue from the same plan. Agree who owns each issue before agents edit the same files. The teammate who requested the feature checks the result against the issue's acceptance criteria.

Use OpenSpec update when the plan needs revision. When the change is implemented and verified, use OpenSpec archive to move it into `openspec/changes/archive/` and merge its requirements into `openspec/specs/`.

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

For ticket-handoff, reference the discussion, topic, or draft. For OpenSpec commands, name the change when continuing existing work.

## Check and maintain the workflow

Run these in the terminal from the repo root:

```sh
npm run openspec -- --version
npm run openspec -- list
npm run openspec:check
```

`npm run check` includes OpenSpec validation alongside TypeScript, lint, and formatting. CI runs the same checks. `openspec:check` also checks that all six OpenSpec workflows have the npm commands and tool declarations in both agents and the Claude commands. Spec validation checks document structure; verify the app against the acceptance scenarios too.

Chat commands such as `$openspec-propose` and `/opsx:propose` select a workflow. Its shell commands run through `npm run --silent openspec -- ...`, which uses the pinned local executable and keeps JSON output readable by agents. A bare `openspec` shell command requires a separate installation and may use a different version. Generated skill examples and tool declarations use the npm form directly. Instructions returned by the CLI can still use upstream command names; the skills tell agents to apply the same npm prefix.

To refresh the shared Codex and Claude Code integrations:

```sh
npm run openspec:refresh
```

This runs the pinned generator with the core workflows and a temporary configuration, then adapts its output to npm. It does not depend on or change a teammate's global OpenSpec profile. Commit the generated files so teammates inherit the result. Use this command instead of direct OpenSpec init or update, which would restore upstream shell commands. To support another agent or workflow, extend `tools/openspec-skills.mjs` and its checked file list together.

`grill-me` and `ticket-handoff` are team-owned skills, maintained directly in this repo. `grill-me` reuses the developer's existing interview skill with project context and an issue handoff. `ticket-handoff` defines this team's ticket workflow. They are not installed from Matt Pocock's skill collection and have no dependencies on it. Edit their canonical `SKILL.md` files in `.agents/skills/`; `.claude/skills/` contains relative directory symlinks to those copies. They do not have external-source entries in `skills-lock.json`, which tracks the installed Convex skills.

For a deliberate upgrade, install an exact version with `npm install --save-dev --save-exact @fission-ai/openspec@<version>`, then run `npm run openspec:refresh`. Review the generated changes, run `npm run check`, and commit the dependency, lockfile, and integrations together. Keep project-specific workflow rules in `AGENTS.md` and `openspec/config.yaml`; generated skills and commands are overwritten during refresh.

References: [OpenSpec setup](https://openspec.dev/docs/setup), [project configuration](https://openspec.dev/docs/project-config), and [supported tools](https://openspec.dev/docs/supported-tools).

## React checks

`npm run lint` includes JSX, accessibility, and six React Doctor rules for derived state, fetching in effects, event logic in effects, impure state updates, and missing or incorrect effect cleanup. These rules use the pinned `oxlint-plugin-react-doctor` package and run through the existing commit hook and CI. There is no separate scanner or score requirement. `npm run lint:fix` applies available lint fixes; `npm run format` formats authored code. Review fixes before committing.

Generated shadcn files in `src/components/ui/` are excluded from linting and formatting. TypeScript and the build still check them. Their usage in authored app code remains linted, including React Router link destinations and labels on shared buttons and fields. Keep authored components outside the generated directory.
