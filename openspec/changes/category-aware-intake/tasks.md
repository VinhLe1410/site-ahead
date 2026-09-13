## 1. Category descriptions

- [x] 1.1 Add the optional description schema field and normalized category mutation inputs with a shared 2,000-character limit. Verify existing dev records deploy without migration, omitted updates preserve descriptions and explicit blank input clears them.
- [x] 1.2 Add description editing to the existing category form with scope guidance and the shared limit. Verify a saved description survives reloading its editor and templates remain unchanged.

## 2. Catalog matching

- [x] 2.1 Include optional descriptions in the current organization catalog and revise the existing draft-agent instructions. Verify the context contains saved descriptions, no fixed supported-trade list remains, and selected IDs still pass organization validation.

## 3. Verification and delivery

- [x] 3.1 Deploy to the existing dev backend and reuse suitable PR #18 description wording on existing dev categories without merging that PR. Verify live clear-match, no-match, vague-input and address-correction turns against available data, recording any untested scenarios.
- [x] 3.2 Complete independent review, run npm run check and verify the category editor in the local app. Record results with the change for PR review.
