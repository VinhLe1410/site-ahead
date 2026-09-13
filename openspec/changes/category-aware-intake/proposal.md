## Why

Job intake already reads organization categories, but its prompt names fixed supported trades and only receives category titles. Members need their saved category descriptions to explain which work belongs in each category.

## What Changes

- Add an optional category description that members can create, edit and clear.
- Match typed and transcribed intake against current organization category names and descriptions. Remove fixed trade restrictions and supersede older assistant claims about available categories.
- Preserve manual selections, ask about ambiguous work and allow Uncategorized when no category fits.
- Keep existing categories valid without a backfill. Reuse relevant description wording from PR #18 for existing dev categories during verification without merging that PR.
- Keep legacy extraction endpoints, automation tools, form support and category-name-based execution rules outside this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `category-management`: Members can maintain optional descriptions that explain category scope.
- `job-management`: Conversational intake selects from the current organization catalog and preserves user choices.

## Impact

Convex category schema and mutations, draft-agent context and instructions, and the category editor. No new dependency or agent. Existing job checklists remain unchanged. Verify with current dev categories and existing checks; do not introduce synthetic category fixtures or merge PR #18.
