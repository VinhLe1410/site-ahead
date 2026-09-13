## Context

See [proposal.md](proposal.md) for scope. The app already uses Tailwind theme variables, Geist, Base UI, and shadcn primitives. Shared descriptions currently encourage repeated page copy, while checklist items and category template rows each occupy separate cards.

The `app-access`, `user-auth`, `job-management`, `category-management`, and `organization-management` requirements were reviewed alongside the organization change. These requirements are now synced into the main specs. This change retains the existing organization gates and manual workflows. The broader product documents and reference prototype describe features beyond this branch's implementation.

## Decisions

### Theme the existing library

Keep the original OKLCH values from the prototype in `src/index.css`, including matching dark values. The six main light colours are page `#F6F4F1`, surface `#FFFFFF`, text `#161310`, sidebar `#1B1815`, primary `#F2AC01`, and border `#D8D7D3`. Keep a darker focus colour for clear keyboard outlines. Add only the semantic colours used for job status and checklist kinds; labels carry meaning alongside colour.

Use Geist at 14–16px for working content, 24–28px for page titles, and 48–60px for the landing headline. Keep prose below 80 characters per line where practical. Use 4px spacing increments, square controls, flat bordered surfaces, and generous click areas. Amber identifies the main action and selected navigation. Keep shadows for overlays only.

Adjust the existing primitive classes where sizing or a hardcoded corner prevents consistent styling. Theme variables alone cannot resize the current 32px controls or square the checkbox. Do not create a second button library or add global selectors that fight utility classes. Keep authored shared patterns outside `src/components/ui/`.

### Use real content for hierarchy

Use one shared brand mark and one page heading with a title and actions. Remove generic description slots from working page headings. Place job category and status together with the job heading instead of repeating the address and category in a separate details card. Show the checklist before the saved intake. Lists use one bordered surface with rows; forms use labelled fields and grouped sections. Forms can sit directly inside dialogs without nested cards.

Keep the prototype's headline beside an example checklist on the landing page. Its more generic uppercase labels, excessive explanations, and repeated feature cards do not carry into the implementation. The example describes current manual preparation and contains no live data. Login keeps the first-account explanation. Invitations keep account matching and manual sharing information. Consequence text belongs beside the relevant action.

### Expand notes within their item

Extract the checklist row to the job feature's components directory and retain the current mutation calls and document types. The row shows checkbox, title, kind, and a speech-bubble button. A saved note appears below the title with a two-line preview. The full editable note opens below the row with Save note and Cancel controls.

Start each editing session from the current saved note. Keep the draft while saving or after failure, and close only on success or cancellation. Saving an empty string clears the note. Use the existing independent status and notes mutations. Restore keyboard focus to the note button when the editor closes. A chat thread, autosave, and a new notes data model are unnecessary.

```text
Checklist
[ ] Confirm site access             On site     [note]
    Gate locked. Call before arrival.
-----------------------------------------------------
[x] Check safety switch             On site     [note]
```

### Verify the current app

Review the landing page, lists, checklist, category form, organization screen, auth screens, and dialogs at desktop widths. Mobile refinement and verification are deferred at the developer’s request. Include long text, long notes, an open editor, empty results, and failures. Keep the existing dark theme usable without introducing a theme switch. Check focus, checkbox toggles, note save/cancel/clear/retry, and dialog dismissal. Use existing checks and temporary browser fixtures where authenticated live data is unavailable; do not add a test suite or deploy a backend for visual verification.

## Risks / Trade-offs

- Amber is too light for small text on white. Use it as a background with dark text and retain legible foreground colours for links and focus.
- Long content can crowd compact layouts. Allow rows and action groups to wrap and preserve readable controls.
- Removing descriptions can hide required consequences. Retain the specific messages required by auth, invitation, category reassignment, template editing, and deletion specs.
- Changing shared primitive defaults affects every screen. Review representative menus and dialogs as well as pages before considering the change complete.
