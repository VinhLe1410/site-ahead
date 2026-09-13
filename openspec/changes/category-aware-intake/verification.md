# Verification

Verified on 14 September 2026 against `hackathon-dev`, deployment `brainy-gopher-762`, and the existing localhost app. Used the existing Carpentry category in one organization and Electrical/Excavation categories in another. No category fixtures or jobs were created. Two private intake drafts were created using existing dev members; the current user's draft was not used.

## Saved descriptions

Reused this wording from [PR #18](https://github.com/VinhLe1410/site-ahead/pull/18) without merging its code:

- Carpentry & Renovation: “Timber framing, decking, pergolas, doors, windows, skirting, cabinetry, structural timber.”
- Electrical Work: “Switchboards, wiring, EV chargers, lighting, power outages, safety switches / RCDs.”

Both descriptions remain saved in dev only. Production categories are not backfilled by this PR.

Saving and reopening the Carpentry editor retained its description. The field has a 2,000-character limit and scope guidance. Live mutation checks verified trimming, preservation when an update omits description, explicit whitespace clearing, and rejection of 2,001 characters without changing the saved category. Checklist contents remained unchanged. Reading the Electrical category from the Carpentry organization's member returned no record.

## Live intake

| Request | Observed result |
| --- | --- |
| Replace rotted deck boards and repair a timber pergola | Selected the existing Carpentry & Renovation category |
| Correct only the address after manually selecting Carpentry | Changed the address and retained the category |
| Install an EV charger in the Carpentry-only organization | Left category empty and explained that Electrical was unavailable in the current catalog |
| Dig a trench for underground services in the Electrical/Excavation organization | Selected the existing Excavation & Trenching category despite its absence from the former prompt's named trades |
| Client only says some work needs doing | Left category empty and requested a more specific work description |

The running agent context included the correct organization's saved descriptions. Excavation remained usable without a description. The final prompt passed all five live checks. An initial clear-match attempt exposed an instruction gap; the implemented prompt explicitly requires filling an unselected category when exactly one match fits.

## Checks and limits

Two independent agents reviewed the implementation. `npm run check` passed, including all 60 existing tests, typechecking, lint, formatting and OpenSpec validation. `npm run build` passed with the existing bundle-size warning. The final Convex code deployed successfully to dev.

No new automated tests were added. No new category was created to test overlapping descriptions or the 200-category limit. Microphone transcription was not rerun; code inspection confirms sent transcripts use the same tested chat path. No production data, legacy extractor, automation tools or category-name-based execution rules were changed.
