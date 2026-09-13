## Context

See proposal.md for motivation. `jobDrafts.context` already reads at most 201 organization categories, rejects catalogs over 200 and passes IDs and titles to the persistent intake agent. Voice transcripts use this same chat flow. Categories currently store title and template only. PR #18 changes a separate legacy extractor and supplies useful descriptive wording, but its fixed trade enum does not belong in this flow.

## Goals / Non-Goals

Extend existing category storage, editor and draft context without adding a classifier or separate taxonomy. Keep category matching independent of the current evidence tools and carpentry-specific preparation/form routing. Leave legacy extraction endpoints and their eval scripts unchanged.

## Decisions

- Store `description` as an optional string so populated deployments remain valid without migration. Trim input and limit it to 2,000 characters using one shared limit. Explicit blank input removes the description; omitted update arguments preserve it for existing callers.
- Add a labeled textarea beside the category name with guidance about scope, examples and exclusions. Reuse generated category API types and existing mutation wiring.
- Pass only category ID, title and optional description to the existing agent each turn. Full templates increase prompt size and confuse selection with execution. Keep the existing bounded catalog query and server validation of selected IDs and organization membership.
- Make the current catalog authoritative over older conversation claims. Preserve a selected category absent an explicit change request. Ask when unclear; allow Uncategorized when nothing matches. Descriptions remain untrusted data, never executable instructions.
- Use PR #18 wording for the existing dev Carpentry and Electrical categories where appropriate. Keep dev data edits out of production and do not merge the teammate branch.

## Risks / Trade-offs

- Model matching remains probabilistic. Keep manual selection and validate saved IDs; verify clear match, no match, vague input and an address-only correction against actual dev data.
- Categories without descriptions supply less context. Ask when their titles are insufficient rather than requiring an immediate backfill.
- Category renames can still affect existing carpentry-specific execution rules. This change does not alter those capabilities or promise new tools.

## Migration Plan

Deploy the optional schema field and mutations to the existing dev backend, then verify the editor and live chat. Populate only relevant existing dev category descriptions. Production receives code through the normal PR deployment flow; no production data backfill is included. A rollback must retain the optional schema field while records contain descriptions.
