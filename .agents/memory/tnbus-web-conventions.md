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

## Dashboard/admin metrics are derived proxies (no dedicated source tables)
There is no `saved_routes` table and no schedule-adherence/on-time feed. Current
real-but-proxy derivations (keep consistent unless a real source is added):
- Dashboard `savedRoutes` = count of distinct `origin→destination` the passenger
  has booked. Stats endpoint returns zeros for missing/invalid passengerId (the
  old all-hardcoded fallback was removed).
- Dashboard popular-routes: `bookingsCount`/`avgFare` from real bookings grouped
  by route; `nextDeparture` from the soonest future `schedules` row.
- Admin `onTimePercentage` = mean `buses.punctualityScore` (active buses preferred).
- Admin `revenueByBusType` = bookings aggregated by the bus's real `busType`,
  resolved via `bookings.busNumber → buses.busNumber`.
- Search/fare-calendar comfort/safety/driver/delay/fareTrend remain deterministic
  `seeded()` derivations (stable per trip, still not real telemetry).

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

## Women-only seat enforcement is scoped to group bookings only (opt-in by payload)
Women-only seats are front-row: parsed from `seatNumber` as row<=2 AND column A/B
(`isWomenOnlySeat` in `api-server/src/lib/seats.ts`). `validateCoPassengers`
enforces (one entry per seat, women-only seats require `gender:"female"`) ONLY when
a `coPassengers` list is present on the booking. Legacy single bookings and POS/
AdminPOS flows omit `coPassengers`, so they bypass enforcement and stay unaffected.
Online `Book.tsx` always sends `coPassengers` (per-seat name+gender); lead =
`coPassengers[0]` → `passengerName`; one shared `passengerPhone` contact.
**Why:** retrofitting strict gender rules onto counter/walk-in flows would break
them; making enforcement payload-driven keeps the new group flow strict without
touching existing surfaces.
**How to apply:** seat occupancy/women-only is still deterministic-seeded, not real
inventory — don't treat `isWomenOnly` as authoritative inventory state.

## SOS / safety is presentational only (no real dispatch)
`SosButton.tsx` (floating button + dialog: helplines 112/1091/108/1098 + share/copy
location context) and `SafetyPanel.tsx` are pure UI. SOS appears on `Track.tsx`
(live context: busNumber/lat/lng/nextStop/speed) and `Confirmation.tsx` (upcoming/
active trip, no live coords). No backend emergency endpoint exists by design.

## Money-moving paths must enforce session ownership; the rest of the app does not
Most `/passengers/:id/*` routes intentionally trust the path/body id with no authz
(POS/walk-in flows send sentinel passenger id 0). The EXCEPTION is anything that
moves stored value — wallet top-up, reward redeem, pass purchase, and the
wallet-funded branch of booking creation — which must require an authenticated
session AND match it to the target passenger (401 unauthenticated, 403 mismatch).
Value-moving amounts are always recomputed server-side from the trusted schedule
fare, never from the client `totalFare`.
**Why:** these are the only IDOR vectors that are directly exploitable for money;
guarding them while leaving the rest open is a deliberate split, so when adding any
new endpoint, decide which side of this line it falls on before shipping.
**How to apply:** if an endpoint debits/credits a wallet, mints reward points, or
sells a pass, gate it on session ownership and derive the amount from server data.
