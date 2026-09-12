## Planning and implementation

Use the installed OpenSpec skills to explore ideas, propose scoped changes, and implement their tasks. Read `openspec/config.yaml` for project context and `docs/Workflow.md` for the team workflow. Small fixes with clear scope can proceed directly when requested.

OpenSpec is a pinned local dependency. Run every CLI example written as `openspec ...` using `npm run --silent openspec -- ...` from the repo root. This includes commands inside generated skills. Do not require a global installation.

Planning requests produce plans. Implement when the user authorizes implementation, and preserve authorization already given in the conversation. Do not add approval steps solely because a generated skill assumes a different workflow. Keep scope changes explicit.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
