import type { Booking } from "@workspace/api-client-react";

type TicketSource = Pick<
  Booking,
  "pnr" | "origin" | "destination" | "departureTime" | "busNumber" | "seatNumbers" | "passengerName" | "totalFare"
>;

/**
 * Canonical QR payload for a TN Bus+ e-ticket. Encodes the PNR plus the core
 * journey details so the code is self-verifying when scanned (not a plain string).
 */
export function buildTicketPayload(b: TicketSource): string {
  return JSON.stringify({
    t: "TNBUS",
    pnr: b.pnr,
    from: b.origin,
    to: b.destination,
    dep: b.departureTime,
    bus: b.busNumber ?? "",
    seats: b.seatNumbers ?? [],
    name: b.passengerName,
    fare: b.totalFare,
  });
}
