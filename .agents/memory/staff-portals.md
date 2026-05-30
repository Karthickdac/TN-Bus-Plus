---
name: Staff portals (conductor/driver) auth & offline queue
description: Durable design rules for role-scoped staff endpoints and the conductor offline-validation queue in TN Bus+.
---

# Staff portal authorization scoping

Staff endpoints (conductor/driver) must derive the operating bus/depot from the
**session** (resolved crew → assignedBusNumber), never from a client-supplied id.

**Rule:** A conductor with no resolvable assigned bus must be rejected (403) on
`/conductor/validate`, not allowed through with a null scope.

**Why:** If the bus-match check is gated on `assignedBus &&` and `assignedBus` is
null, the mismatch branch is skipped and a conductor can validate any PNR across
the whole fleet (IDOR). Admin is intentionally unscoped (oversight role).

**How to apply:** In `artifacts/api-server/src/routes/staff.ts`, the handler reads
`getStaff(res)` → `passenger.role` + resolved `bus`/`crew`. Guard conductors
before booking lookup. `getStaff` returns the full `StaffContext` (`passenger`,
`crew`, `bus`, `depot`) — role lives on `passenger.role`, not at the top level.

# Conductor offline validation queue

**Rule:** Only enqueue/retry a ticket validation on a *network* failure, not on a
server (HTTP) error.

**Why:** A 4xx/5xx is a definitive server response (bad input, no bus, etc.).
Queuing it just replays a guaranteed failure; on flush it can permanently block
every later queued item if the loop `break`s on first failure.

**How to apply:** In `artifacts/tnbus-web/src/pages/conductor/Validate.tsx`,
`isNetworkError(err)` returns false when `err.name === "ApiError"` (custom-fetch
throws `ApiError` on non-2xx; transport failures throw `TypeError`). On flush:
`break` on network errors (retry remaining later) but `removeScan` a definitive
rejection so one bad item can't stall the queue. Guard concurrent flushes
(online event + manual "Sync now") with a `useRef` mutex released in `finally`.
