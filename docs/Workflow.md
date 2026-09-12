# Team workflow

Use OpenSpec to turn an idea into a small scope, a plan, and tasks a coding agent can follow. The workflow and plans live in this repo so another teammate can continue the work.

## First use

1. Install Node.js 24 or newer and clone the repo.
2. Run `npm ci` in the repo folder.
3. Open that folder in Codex or Claude Code with your own account. Restart an existing agent session to load the new skills.
4. Paste one of the prompts below into the agent chat.

OpenSpec 1.13.0 is pinned in `package.json` and `package-lock.json`. It requires Node.js 20.19 or newer, which this project's Node.js 24 requirement satisfies. The generated skills are included in the repo. Teammates do not need to run OpenSpec initialization or install it globally.

Planning can start without running the app. Building and checking Convex changes also requires the app setup described in [README.md](../README.md).

## Scope an idea

Paste this into your agent chat and replace the feature description:

> Use OpenSpec explore to help me scope the contractor intake screen. Read our project context and existing code. Ask me about decisions that change what we build. Suggest a small outcome we can demo, and state what we will leave out. Do not implement yet.

Then ask for the plan:

> Use OpenSpec propose to turn our agreed scope into a change named contractor-intake. Include observable acceptance scenarios and small coding tasks ordered by dependency. Stop after writing the plan so I can review it.

The agent writes `proposal.md`, requirements under `specs/`, `tasks.md`, and a `design.md` when the change needs technical design, inside `openspec/changes/contractor-intake/`.

Review the proposal and scenarios. Check that they describe the outcome you want and exclude work you do not want. Ask the agent to revise anything unclear before handing it off.

## Build or hand off

To build an agreed change, paste:

> Use OpenSpec apply to implement contractor-intake. Read its files from disk, follow the tasks, and keep their checkboxes current. Run the required checks and explain how I can try the result.

For a handoff, commit the change folder on your branch and share that branch with the next teammate. They check out the branch and use the same prompt. Commit specs and code together as implementation progresses. Use one branch per change, and agree who owns it before two agents edit the same files.

To adjust an existing plan, ask the agent to use OpenSpec update for that change and describe the adjustment. When the result works and its tasks are complete, ask the agent to use OpenSpec archive. This moves the change into `openspec/changes/archive/` and merges its requirements into `openspec/specs/`.

## Explicit commands

Type these in agent chat, not in the terminal. Plain-language requests above work too.

| Action                     | Codex                      | Claude Code     |
| -------------------------- | -------------------------- | --------------- |
| Explore an idea            | `$openspec-explore`        | `/opsx:explore` |
| Write a proposal and tasks | `$openspec-propose`        | `/opsx:propose` |
| Revise a change            | `$openspec-update-change`  | `/opsx:update`  |
| Implement a change         | `$openspec-apply-change`   | `/opsx:apply`   |
| Archive completed work     | `$openspec-archive-change` | `/opsx:archive` |

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

For a deliberate upgrade, install an exact version with `npm install --save-dev --save-exact @fission-ai/openspec@<version>`, then regenerate the configured integrations with `npm run openspec -- init --tools codex,claude --profile core`. Include any additional tools the team has adopted. Review the generated changes, run `npm run check`, and commit the dependency, lockfile, and integrations together.

References: [OpenSpec setup](https://openspec.dev/docs/setup), [project configuration](https://openspec.dev/docs/project-config), and [supported tools](https://openspec.dev/docs/supported-tools).
