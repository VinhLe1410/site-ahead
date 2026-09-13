# A2 item-resolution classification verification

- Command: `npm run verify:classification`
- Runtime: Node.js 24
- Verified at: `2026-09-13T08:10:39.663Z`
- Input: the seven-item Carpentry & Renovation sample from the A2 roadmap step
- Result: 7 classifications, 0 fallbacks, 0 unknown model IDs
- Usage: 343 input tokens, 68 output tokens, 411 total tokens
- Trace: [2360fd5c13629d5626528e2ce230e3ae](https://us.cloud.langfuse.com/trace/2360fd5c13629d5626528e2ce230e3ae)

The successful result was:

```json
[
  { "id": 1, "category": "automated" },
  { "id": 2, "category": "on_site" },
  { "id": 3, "category": "automated" },
  { "id": 4, "category": "automated" },
  { "id": 5, "category": "third_party" },
  { "id": 6, "category": "third_party" },
  { "id": 7, "category": "third_party" }
]
```

The fallback regression check also passes for missing, invalid, and whole-call model output failures; those cases default to `on_site` and expose a fallback reason.
