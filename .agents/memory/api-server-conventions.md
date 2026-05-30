---
name: API server conventions
description: Non-obvious constraints when adding/editing Express routes in artifacts/api-server.
---

## noImplicitReturns is enabled

The api-server tsconfig has `noImplicitReturns`, so every code path in a route
handler that returns a value on one branch must return on all branches. Express
handlers that do `if (!x) return res.status(404)...` then fall through to send a
response will raise `TS7030: Not all code paths return a value`.

**Why:** several pre-existing route files (bookings, buses, passengers, routes,
tracking) violated this and failed typecheck before being fixed with trivial
`return` additions. New handlers must follow suit.

**How to apply:** end handler branches with `return res.json(...)` /
`return res.status(...).json(...)`, or add a trailing `return;`. Run
`pnpm --filter @workspace/api-server run typecheck` to confirm.

## Serialization contract

When returning DB rows as JSON: convert Drizzle `numeric` columns to `Number(...)`,
timestamps to `.toISOString()`, and null-guard optional fields. Match the existing
`serialize*` helper pattern in the route files.

## AI calls must never crash the endpoint

AI helpers (e.g. complaintAI, aiInsights) wrap the Anthropic call in try/catch and
fall back to a deterministic heuristic, so admin endpoints keep working when the AI
integration is unavailable. Preserve this fallback for any new AI-backed route.
