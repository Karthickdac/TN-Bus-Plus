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

## E-ticket QR is rendered client-side from a canonical payload
`buildTicketPayload(booking)` (`src/lib/ticket.ts`) is the single source of QR
content; `TicketQR` renders it with `qrcode.react`. Confirmation, My Trips, and
PNR all render from booking fields, so the same scannable code appears everywhere
regardless of what `bookings.qrCode` stored. Backend also stores the same JSON
shape (`POST /bookings`).
**Why:** keeps QR consistent across surfaces and robust to old seeded rows whose
`qrCode` is a legacy `QR:...` string.

## Seat occupancy is deterministic but still NOT real
`GET /schedules/:id/seats` now picks booked seats deterministically (seeded by
`scheduleId`), so the grid is stable across loads. It is still **not** derived
from real booked `seatNumbers` — true occupancy + transactional booking remains
unbuilt (separate task).

## Known systemic limitations (pre-existing, app-wide — see follow-up tasks)
- `POST /bookings` is not transactional: no seat-availability check, no conflict
  detection, does not decrement `schedules.availableSeats` -> overbooking possible.
- The booking/PNR read API has NO auth: `GET /bookings/:id` returns full booking
  data for any enumerable id, and `/booking/:id` UI route is public -> IDOR. Fixing
  it needs real auth (Book.tsx hardcodes `passengerId`), so it's a security task,
  not a one-endpoint patch.
- `/admin/*` routes (frontend) and admin APIs have no authz; AuthUser has no role field.

## Loyalty/wallet value must derive from server-side fare, never client input
Reward points on `POST /bookings` are computed from the AUTHORITATIVE schedule
fare (`schedule.fare` × seat count), NOT the client-supplied `totalFare`.
**Why:** points redeem into real wallet credit (1pt=₹1 via
`/passengers/:id/rewards/redeem`), so trusting client fare would let a caller
mint arbitrary balance by inflating the booking fare. NOTE: the ticket *charge*
itself still trusts client `totalFare` (pre-existing, app-wide) — separate
follow-up. Wallet/pass mutations (topup/redeem/purchase in `passes.ts`) use
`db.transaction` + `.for("update")` row locks; post-commit notifications are
best-effort (try/catch) so a notify failure never returns a false 500.
