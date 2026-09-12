## Planning and implementation

Use the installed OpenSpec skills to explore ideas, propose scoped changes, and implement their tasks. Read `openspec/config.yaml` for project context and `docs/Workflow.md` for the team workflow. Small fixes with clear scope can proceed directly when requested.

Read relevant existing OpenSpec specs and available project documents before grilling an idea. Use `grill-me` to clarify the outcome, then `ticket-handoff` to turn the agreed discussion into one or more actionable issues. An OpenSpec change is not required for this handoff. Engineering picks up the issues, creates a scoped OpenSpec change with design and tasks, and implements it. Nontechnical teammates define and review behavior. Keep these team-owned skills in `.agents/skills/` with relative directory symlinks in `.claude/skills/`.

OpenSpec is a pinned local dependency. Run every CLI example written as `openspec ...` using `npm run --silent openspec -- ...` from the repo root. This includes commands inside generated skills. Do not require a global installation.

Planning requests produce plans. Implement when the user authorizes implementation, and preserve authorization already given in the conversation. Do not add approval steps solely because a generated skill assumes a different workflow. Keep scope changes explicit.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## Hackathon scope

Keep only `convex-expert`, `convex-docs`, and `convex-seed` installed for this hackathon. Store the canonical copies in `.agents/skills/` and use relative directory symlinks in `.claude/skills/`. Preserve this selection and layout when refreshing skills, and keep `skills-lock.json` in sync. Install other skills only when a task needs them. Keep the generated Convex guidelines and the references above.

Use ordinary Convex actions for bounded LLM extraction, drafting, and report calls. Add agent or workflow components only when a specific feature needs their capabilities. This project rule overrides skill instructions that require those components for every LLM feature or multistep flow.
