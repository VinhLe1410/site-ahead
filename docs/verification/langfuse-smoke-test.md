# Langfuse smoke-test verification

The verification command was run against the configured Convex development deployment and Langfuse project with Node.js 24.

Command: `npm run verify:langfuse`

Successful output from the real run:

```json
{
  "traceId": "f46407ce1d4b92a41bd901e5dc4883b5",
  "traceName": "site-ahead-observability-smoke-1789285341095-3iip4q3f",
  "uiUrl": "https://us.cloud.langfuse.com/trace/f46407ce1d4b92a41bd901e5dc4883b5",
  "usage": {
    "input": 30,
    "output": 6,
    "input_cached_tokens": 0,
    "total": 36
  },
  "verifiedAt": "2026-09-13T07:42:33.944Z"
}
```
