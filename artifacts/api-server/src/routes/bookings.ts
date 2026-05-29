import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, schedulesTable, busesTable, routesTable, refundsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { CreateBookingBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

function generatePnr(): string {
  return "TN" + Date.now().toString().slice(-8).toUpperCase();
}

function generateQrPayload(input: {
  pnr: string;
  origin: string;
  destination: string;
  departureTime: string;
  busNumber: string;
  seatNumbers: string[];
  passengerName: string;
  totalFare: number;
}): string {
  return JSON.stringify({
    t: "TNBUS",
    pnr: input.pnr,
    from: input.origin,
    to: input.destination,
    dep: input.departureTime,
    bus: input.busNumber,
    seats: input.seatNumbers,
    name: input.passengerName,
    fare: input.totalFare,
  });
}

router.get("/bookings", async (req, res) => {
  const { passengerId, status } = req.query;
  let rows = await db.select().from(bookingsTable);
  if (passengerId) rows = rows.filter(b => b.passengerId === parseInt(String(passengerId)));
  if (status) rows = rows.filter(b => b.status === String(status));
  res.json(rows.map(b => ({
    ...b,
    totalFare: Number(b.totalFare),
    createdAt: b.createdAt.toISOString(),
    seatNumbers: b.seatNumbers ?? [],
  })));
});

router.post("/bookings", async (req, res) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  // Look up schedule, bus, route for full info
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, data.scheduleId));
  const bus = schedule ? (await db.select().from(busesTable).where(eq(busesTable.id, schedule.busId)))[0] : null;
  const route = schedule ? (await db.select().from(routesTable).where(eq(routesTable.id, schedule.routeId)))[0] : null;

  const pnr = generatePnr();
  const origin = route?.origin ?? "Chennai";
  const destination = route?.destination ?? "Madurai";
  const departureTime = schedule?.departureTime.toISOString() ?? new Date().toISOString();
  const arrivalTime = schedule?.arrivalTime.toISOString() ?? new Date().toISOString();
  const busNumber = bus?.busNumber ?? "TN-XXX";
  const qrCode = generateQrPayload({
    pnr,
    origin,
    destination,
    departureTime,
    busNumber,
    seatNumbers: data.seatNumbers,
    passengerName: data.passengerName,
    totalFare: data.totalFare,
  });

  const [booking] = await db.insert(bookingsTable).values({
    pnr,
    passengerId: data.passengerId,
    scheduleId: data.scheduleId,
    busNumber,
    origin,
    destination,
    departureTime,
    arrivalTime,
    seatNumbers: data.seatNumbers,
    totalFare: String(data.totalFare),
    status: "confirmed",
    paymentStatus: "paid",
    passengerName: data.passengerName,
    passengerPhone: data.passengerPhone,
    qrCode,
  }).returning();

  await createNotification({
    passengerId: booking.passengerId,
    type: "booking",
    title: `Booking confirmed: ${origin} → ${destination}`,
    body: `Your ticket is confirmed. PNR ${pnr}, seats ${data.seatNumbers.join(", ")} on bus ${busNumber}.`,
  });

  res.status(201).json({
    ...booking,
    totalFare: Number(booking.totalFare),
    createdAt: booking.createdAt.toISOString(),
    seatNumbers: booking.seatNumbers ?? [],
  });
});

router.get("/bookings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!row) return res.status(404).json({ error: "Booking not found" });
  res.json({ ...row, totalFare: Number(row.totalFare), createdAt: row.createdAt.toISOString(), seatNumbers: row.seatNumbers ?? [] });
});

router.post("/bookings/:id/cancel", async (req, res) => {
  const id = parseInt(req.params.id);

  // Run the cancellation, refund creation, and notification atomically so a
  // partial failure can never leave a cancelled booking without its refund
  // record. A row-level lock prevents concurrent cancels from racing and
  // creating duplicate refund rows for the same booking.
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(bookingsTable)
      .where(eq(bookingsTable.id, id)).for("update");
    if (!row) return null;
    if (row.status === "cancelled") return row;

    const [cancelled] = await tx.update(bookingsTable)
      .set({ status: "cancelled", paymentStatus: "refund_pending" })
      .where(eq(bookingsTable.id, id)).returning();

    // Open a refund request the passenger can track. Government refunds
    // typically credit back within 5-7 working days. Guard against duplicates
    // in case a prior attempt partially succeeded.
    const [existingRefund] = await tx.select().from(refundsTable)
      .where(eq(refundsTable.bookingId, cancelled.id));
    if (!existingRefund) {
      const estimatedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await tx.insert(refundsTable).values({
        bookingId: cancelled.id,
        passengerId: cancelled.passengerId,
        amount: cancelled.totalFare,
        status: "processing",
        reason: "Booking cancelled by passenger",
        estimatedDate,
      });

      await createNotification({
        passengerId: cancelled.passengerId,
        type: "refund",
        title: `Refund initiated: ${cancelled.origin} → ${cancelled.destination}`,
        body: `Your booking ${cancelled.pnr} was cancelled. A refund of ₹${Number(cancelled.totalFare).toFixed(2)} is being processed and will be credited within 5-7 working days.`,
      }, tx);
    }

    return cancelled;
  });

  if (!updated) return res.status(404).json({ error: "Booking not found" });
  return res.json({ ...updated, totalFare: Number(updated.totalFare), createdAt: updated.createdAt.toISOString(), seatNumbers: updated.seatNumbers ?? [] });
});

// Smart rebooking suggestions: other upcoming departures on the same route.
router.get("/bookings/:id/rebooking-suggestions", async (req, res) => {
  const id = parseInt(req.params.id);
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const matchingRoutes = await db.select().from(routesTable)
    .where(and(eq(routesTable.origin, booking.origin), eq(routesTable.destination, booking.destination)));
  const routeIds = new Set(matchingRoutes.map(r => r.id));
  if (routeIds.size === 0) {
    return res.json([]);
  }

  const now = new Date();
  const schedules = await db.select().from(schedulesTable)
    .where(gt(schedulesTable.departureTime, now));

  const upcoming = schedules
    .filter(s => routeIds.has(s.routeId) && s.id !== booking.scheduleId)
    .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())
    .slice(0, 6);

  const busIds = [...new Set(upcoming.map(s => s.busId))];
  const buses = busIds.length ? await db.select().from(busesTable) : [];
  const busMap = new Map(buses.map(b => [b.id, b]));

  return res.json(upcoming.map(s => {
    const bus = busMap.get(s.busId);
    return {
      scheduleId: s.id,
      busId: s.busId,
      busNumber: bus?.busNumber ?? "TN-XXX",
      busType: bus?.busType ?? "Standard",
      origin: booking.origin,
      destination: booking.destination,
      departureTime: s.departureTime.toISOString(),
      arrivalTime: s.arrivalTime.toISOString(),
      fare: Number(s.fare),
      availableSeats: s.availableSeats ?? 0,
    };
  }));
});

router.get("/pnr/:pnr", async (req, res) => {
  const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.pnr, req.params.pnr));
  if (!row) return res.status(404).json({ error: "PNR not found" });
  res.json({ ...row, totalFare: Number(row.totalFare), createdAt: row.createdAt.toISOString(), seatNumbers: row.seatNumbers ?? [] });
});

export default router;
