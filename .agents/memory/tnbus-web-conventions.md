---
name: TN Bus+ web/api conventions
description: Non-obvious gotchas for the TN Bus+ React+Express+Drizzle monorepo (query hooks, booking, endpoint paths).
---

# TN Bus+ conventions & gotchas

## Generated react-query hooks need an explicit queryKey when gating with `enabled`
The Orval-generated query hooks (e.g. `useSearchBuses`, `useGetSeats`) type their
options so that passing `{ query: { enabled } }` alone is a TS error
(`Property 'queryKey' is missing`). Several pre-existing pages (BusDetail, PNR,
Track) ship with this error unaddressed. To write *new* clean code, supply the
key from the generated helper:
`useGetSeats(id, { query: { enabled: !!id, queryKey: getGetSeatsQueryKey(id) } })`.
**Why:** avoids adding to the repo's pre-existing error count.

## Walk-in / counter bookings use sentinel `passengerId = 0`
`bookings.passengerId` is a plain `integer` with **no FK** to `passengers`.
The POS counter flow books for non-registered walk-ins by sending
`passengerId: 0` plus `passengerName`/`passengerPhone` (stored on the booking).
Reuses the normal `POST /bookings` endpoint — no backend change needed.
**Why:** lets counter staff issue tickets without creating fake passenger accounts.

## HTTP endpoint paths (curl from shell)
- Bus search is `GET /api/search?origin=&destination=&date=` — NOT
  `/api/buses/search` (that hits `/buses/:id` and fails with NaN id).
- Seats: `GET /api/schedules/:scheduleId/seats`.

## Known systemic limitations (pre-existing, app-wide — see follow-up tasks)
- `POST /bookings` is not transactional: no seat-availability check, no conflict
  detection, does not decrement `schedules.availableSeats` -> overbooking possible.
- `GET /schedules/:id/seats` randomly marks booked seats per request (not based on
  real booked seatNumbers), so the seat grid is non-deterministic.
- `/admin/*` routes (frontend) and admin APIs have no authz; AuthUser has no role field.
