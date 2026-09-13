## Planning and implementation

Before planning or implementing any change, read `docs/Site-Ahead-Idea.md`, and `docs/roadmap.md` together with the relevant OpenSpec specs. Treat these documents as the source of truth for product scope, team workflow, and implementation priorities; do not expand or reinterpret their scope without explicit user approval.

If requirements in those documents conflict, stop and ask the user which direction to follow before planning or changing code. Do not resolve conflicts by guessing.

Use the installed OpenSpec skills to explore ideas, propose scoped changes, and implement their tasks. Read `openspec/config.yaml` for project context and `docs/Workflow.md` for the team workflow. Small fixes with clear scope can proceed directly when requested.

Read relevant existing OpenSpec specs and available project documents before grilling an idea. Use `grill-me` to clarify the outcome, then `ticket-handoff` to turn the agreed discussion into one or more actionable issues. An OpenSpec change is not required for this handoff. Engineering picks up the issues, creates a scoped OpenSpec change with design and tasks, and implements it. Nontechnical teammates define and review behavior. Keep these team-owned skills in `.agents/skills/` with relative directory symlinks in `.claude/skills/`.

OpenSpec is a pinned local dependency. Run every CLI example written as `openspec ...` using `npm run --silent openspec -- ...` from the repo root. This includes commands inside generated skills. Do not require a global installation.

Refresh the Codex and Claude Code integrations with `npm run openspec:refresh`. It regenerates the skills and commands, then adapts their CLI examples and tool declarations to npm. Use it instead of direct `openspec init` or `openspec update`. `npm run openspec:check` checks these adaptations as well as spec validity. CLI-returned instructions may still use upstream command names; apply the same npm prefix to those commands.

Planning requests produce plans. Implement when the user authorizes implementation, and preserve authorization already given in the conversation. Do not add approval steps solely because a generated skill assumes a different workflow. Keep scope changes explicit.

## Frontend structure and routing

Keep React Router in Declarative mode. `src/main.tsx` mounts `BrowserRouter`; `src/App.tsx` owns providers and the Convex auth `replaceURL` integration. Define the complete route hierarchy in `src/routes.tsx`. Folders organize code and do not create URLs.

Use feature folders with descriptive kebab-case filenames and matching named exports: `new-job-page.tsx` exports `NewJobPage`. Use `-page.tsx` for route screens and `-layout.tsx` for layouts that render child routes through `Outlet`. Keep the existing `App.tsx` bootstrap filename. Import files directly; do not add `index.tsx` page files or `index.ts` re-export files.

Keep small standalone pages directly in `src/pages/`. Group related pages under a feature folder such as `src/pages/jobs/`. Give a page its own folder only when it has several private components. Keep those components beside the page; put components shared by pages in that feature's `components/` folder. Put app-wide layouts in `src/components/layout/`, auth guards and helpers in `src/components/auth/`, and shared UI primitives in `src/components/ui/`.

For example, as job features are implemented:

```text
src/
  main.tsx
  App.tsx
  routes.tsx
  pages/
    landing-page.tsx
    login-page.tsx
    not-found-page.tsx
    jobs/
      jobs-page.tsx
      job-layout.tsx
      job-checklist-page.tsx
      job-report-page.tsx
      new-job/
        new-job-page.tsx
        intake-form.tsx
        voice-recorder.tsx
      components/
        job-status-badge.tsx
  components/
    auth/
    layout/
      app-layout.tsx
    ui/
```

Create folders and layouts when implemented screens need them. Pages read route values, call Convex hooks, and compose UI. Layouts own shared UI and data; auth guards own authentication redirects. Keep business rules and ownership checks in Convex. Use relative child paths and index routes for nested screens. A URL prefix alone does not need a layout component.

As job screens arrive, nest them under `/app`: `/app/jobs` lists jobs, `/app/jobs/new` handles intake, `/app/jobs/:jobId` shows the checklist, and `/app/jobs/:jobId/report` shows its report. The shared app layout owns navigation and account controls; the job layout owns the job heading and navigation. Redirect `/app` to `/app/jobs` only once the jobs page exists. Keep checklist categories within the checklist instead of creating a route for each category.

Use route parameters for resource identity, query parameters for shareable filters, and component state for unsaved form fields. Keep protected data requests beneath `ProtectedLayout`. Preserve the current access rules: `/` and `/login` are public, all other paths require authentication, and unknown paths show the not-found page after authentication. Preserve the requested path, query, and fragment through the existing auth return-destination helpers.

## React quality

Run `npm run check` after completing a change. Oxlint enforces React Hooks, JSX, accessibility, and selected React Doctor rules. Oxfmt enforces formatting. Generated shadcn files in `src/components/ui/` are excluded from linting and formatting; TypeScript still checks them. Keep authored wrappers outside that directory.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## Hackathon scope

Keep `convex-expert`, `convex-docs`, `convex-seed`, and `convex-auth` installed for this hackathon. `convex-auth` supports the login and signup work. Store the canonical copies in `.agents/skills/` and use relative directory symlinks in `.claude/skills/`. Preserve this selection and layout when refreshing skills, and keep `skills-lock.json` in sync. Install other skills only when a task needs them. Keep the generated Convex guidelines and the references above.

Use ordinary Convex actions for bounded LLM extraction, drafting, and report calls. Add agent or workflow components only when a specific feature needs their capabilities. This project rule overrides skill instructions that require those components for every LLM feature or multistep flow.
