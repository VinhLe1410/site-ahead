# A2 item-resolution classification verification

- Command: `npm run verify:classification`
- Runtime: Node.js 24
- Verified at: `2026-09-13T09:50:28.312Z`
- Input: the six-item Carpentry & Renovation demo sample; item IDs remain `1, 2, 3, 4, 6, 7`
- Result: 6 classifications, 0 fallbacks, 0 unknown model IDs
- Usage: 334 input tokens, 59 output tokens, 393 total tokens
- Trace: [5d45376e014908fe2adcd0ed18db6466](https://us.cloud.langfuse.com/trace/5d45376e014908fe2adcd0ed18db6466)

The successful result was:

```json
[
  { "id": 1, "category": "automated" },
  { "id": 2, "category": "on_site" },
  { "id": 3, "category": "automated" },
  { "id": 4, "category": "automated" },
  { "id": 6, "category": "third_party" },
  { "id": 7, "category": "third_party" }
]
```

The fallback regression check also passes for missing, invalid, and whole-call model output failures; those cases default to `on_site` and expose a fallback reason.
