<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## Hackathon scope

Keep only `convex-expert`, `convex-docs`, and `convex-seed` installed for this hackathon. Store the canonical copies in `.agents/skills/` and use relative directory symlinks in `.claude/skills/`. Preserve this selection and layout when refreshing skills, and keep `skills-lock.json` in sync. Install other skills only when a task needs them. Keep the generated Convex guidelines and the references above.

Use ordinary Convex actions for bounded LLM extraction, drafting, and report calls. Add agent or workflow components only when a specific feature needs their capabilities. This project rule overrides skill instructions that require those components for every LLM feature or multistep flow.
