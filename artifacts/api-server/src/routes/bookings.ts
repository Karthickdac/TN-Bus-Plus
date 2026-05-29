import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, schedulesTable, busesTable, routesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateBookingBody } from "@workspace/api-zod";

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
  const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!row) return res.status(404).json({ error: "Booking not found" });
  const [updated] = await db.update(bookingsTable).set({ status: "cancelled", paymentStatus: "refunded" }).where(eq(bookingsTable.id, id)).returning();
  res.json({ ...updated, totalFare: Number(updated.totalFare), createdAt: updated.createdAt.toISOString(), seatNumbers: updated.seatNumbers ?? [] });
});

router.get("/pnr/:pnr", async (req, res) => {
  const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.pnr, req.params.pnr));
  if (!row) return res.status(404).json({ error: "PNR not found" });
  res.json({ ...row, totalFare: Number(row.totalFare), createdAt: row.createdAt.toISOString(), seatNumbers: row.seatNumbers ?? [] });
});

export default router;
