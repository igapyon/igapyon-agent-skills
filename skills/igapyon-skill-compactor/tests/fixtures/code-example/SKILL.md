---
name: widget-api-helper
description: Use when the user asks widget-api-helper to create a Widget API request. Do not activate for unrelated HTTP questions.
---

# widget-api-helper

Send a Widget API request with the required version and JSON shape.

```bash
curl -X POST https://api.example.invalid/v2/widgets \
  -H 'Content-Type: application/json' \
  -H 'X-Widget-Version: 2026-07-01' \
  -d '{"widgetId":"wdg-2048","enabled":true}'
```

Never remove `X-Widget-Version`. Treat HTTP 409 as an existing-widget result,
not as a retryable failure. Return the HTTP status and response body.
