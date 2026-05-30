import type { CoPassenger } from "@workspace/db";

// Women-only seats mirror the layout rule in the seat-map generator
// (GET /schedules/:id/seats): the first two rows, columns A and B. Seat numbers
// are formatted as `${row}${columnLetter}` (e.g. "1A", "2B"), so we parse them
// back out here. Keeping this in one place means booking-time enforcement can
// never drift from what the seat map shows the passenger.
export function isWomenOnlySeat(seatNumber: string): boolean {
  const match = /^(\d+)([A-Z])$/.exec(seatNumber.trim().toUpperCase());
  if (!match) return false;
  const row = parseInt(match[1], 10);
  const columnLetter = match[2];
  return row <= 2 && (columnLetter === "A" || columnLetter === "B");
}

export type CoPassengerValidation =
  | { ok: true; coPassengers: CoPassenger[] }
  | { ok: false; error: string };

// Validate the per-seat traveller list for a group/family booking. Enforcement
// only kicks in when a list is supplied (the online booking flow always sends
// one); legacy single-passenger and POS counter bookings omit it and keep their
// existing behaviour. When supplied, the rules are authoritative and cannot be
// bypassed from the client:
//   - exactly one named traveller per seat, each mapped to a real seat
//   - every women-only seat must be assigned to a female traveller
export function validateCoPassengers(
  seatNumbers: string[],
  raw: CoPassenger[] | undefined | null,
): CoPassengerValidation {
  if (!raw || raw.length === 0) {
    return { ok: true, coPassengers: [] };
  }

  if (raw.length !== seatNumbers.length) {
    return { ok: false, error: "Add details for every passenger — one per seat." };
  }

  const seatSet = new Set(seatNumbers);
  const seen = new Set<string>();
  for (const cp of raw) {
    if (!cp.name || !cp.name.trim()) {
      return { ok: false, error: "Every passenger needs a name." };
    }
    if (!seatSet.has(cp.seatNumber)) {
      return { ok: false, error: `Passenger seat ${cp.seatNumber} is not part of this booking.` };
    }
    if (seen.has(cp.seatNumber)) {
      return { ok: false, error: `Seat ${cp.seatNumber} has more than one passenger.` };
    }
    seen.add(cp.seatNumber);
  }

  for (const seat of seatNumbers) {
    if (!isWomenOnlySeat(seat)) continue;
    const cp = raw.find(c => c.seatNumber === seat);
    if (!cp || cp.gender !== "female") {
      return {
        ok: false,
        error: `Seat ${seat} is reserved for women — assign a female passenger or choose another seat.`,
      };
    }
  }

  const coPassengers = raw.map(c => ({
    seatNumber: c.seatNumber,
    name: c.name.trim(),
    gender: c.gender,
  }));
  return { ok: true, coPassengers };
}
