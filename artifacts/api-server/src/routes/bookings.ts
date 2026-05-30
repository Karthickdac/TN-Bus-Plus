import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, schedulesTable, busesTable, routesTable, refundsTable, passengersTable, walletTransactionsTable, paymentsTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { CreateBookingBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { getRazorpayClient } from "../lib/razorpay";
import { validateCoPassengers } from "../lib/seats";

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

  // Group/family booking: validate the per-seat traveller list and enforce
  // women-only seat rules server-side so they can't be bypassed from the client.
  const coCheck = validateCoPassengers(data.seatNumbers, data.coPassengers);
  if (!coCheck.ok) return res.status(400).json({ error: coCheck.error });
  const coPassengers = coCheck.coPassengers;

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

  // The amount we actually charge / record. For wallet payments we charge the
  // AUTHORITATIVE server-side fare (schedule price × seats) so a client can
  // never under- or over-debit their own wallet by tampering with `totalFare`.
  // Other (simulated external) payments keep the existing client-supplied
  // amount. Reward value is always derived from the trusted fare.
  const trustedFare = schedule ? Number(schedule.fare) * data.seatNumbers.length : 0;
  const payByWallet = (data.paymentMethod ?? "").toLowerCase() === "wallet";
  const chargedFare = payByWallet ? trustedFare : data.totalFare;
  const rewardPointsEarned = Math.floor(trustedFare / 10);

  // Wallet payment moves stored value, so it must come from the signed-in
  // account and may only debit that same account. Without this, a caller could
  // drain another passenger's wallet by submitting their id (IDOR). Walk-in /
  // counter bookings (sentinel id 0) and schedules with no known fare cannot be
  // settled from a wallet.
  if (payByWallet) {
    const sessionPassengerId = req.session?.passengerId;
    if (!sessionPassengerId) {
      return res.status(401).json({ error: "Please sign in to pay from your wallet." });
    }
    if (sessionPassengerId !== data.passengerId) {
      return res.status(403).json({ error: "You can only pay from your own wallet." });
    }
    if (!(trustedFare > 0)) {
      return res.status(400).json({ error: "This fare cannot be paid from the wallet." });
    }
  }

  const qrCode = generateQrPayload({
    pnr,
    origin,
    destination,
    departureTime,
    busNumber,
    seatNumbers: data.seatNumbers,
    passengerName: data.passengerName,
    totalFare: chargedFare,
  });

  // Settle the wallet debit, the booking row and the loyalty credit atomically
  // so a partial failure can never leave a paid booking without its wallet
  // movement (or vice versa). A row-level lock serialises concurrent debits.
  const result = await db.transaction(async (tx) => {
    if (payByWallet) {
      const [passenger] = await tx.select().from(passengersTable)
        .where(eq(passengersTable.id, data.passengerId)).for("update");
      if (!passenger) return { error: "no_passenger" as const };
      if (Number(passenger.walletBalance) < trustedFare) return { error: "insufficient" as const };
      await tx.update(passengersTable)
        .set({ walletBalance: sql`${passengersTable.walletBalance} - ${trustedFare}` })
        .where(eq(passengersTable.id, data.passengerId));
      await tx.insert(walletTransactionsTable).values({
        passengerId: data.passengerId,
        amount: String(trustedFare),
        type: "debit",
        description: `Bus fare ${origin} → ${destination}`,
      });
    }

    const [booking] = await tx.insert(bookingsTable).values({
      pnr,
      passengerId: data.passengerId,
      scheduleId: data.scheduleId,
      busNumber,
      origin,
      destination,
      departureTime,
      arrivalTime,
      seatNumbers: data.seatNumbers,
      coPassengers,
      totalFare: String(chargedFare),
      status: "confirmed",
      paymentStatus: "paid",
      passengerName: data.passengerName,
      passengerPhone: data.passengerPhone,
      qrCode,
    }).returning();

    // Loyalty: registered passengers earn 1 reward point per ₹10 of the
    // trusted fare. Walk-in/counter bookings (sentinel id 0) have no account
    // to credit and are skipped.
    if (booking.passengerId > 0 && rewardPointsEarned > 0) {
      await tx.update(passengersTable)
        .set({ rewardPoints: sql`${passengersTable.rewardPoints} + ${rewardPointsEarned}` })
        .where(eq(passengersTable.id, booking.passengerId));
    }

    return { ok: true as const, booking };
  });

  if (result.error === "no_passenger") return res.status(404).json({ error: "Passenger not found" });
  if (result.error === "insufficient")
    return res.status(400).json({ error: "Insufficient wallet balance. Please top up your wallet." });

  const booking = result.booking;

  // Best-effort notifications: the booking, payment and points have already
  // committed, so a failed notification must not turn success into a 500.
  try {
    await createNotification({
      passengerId: booking.passengerId,
      type: "booking",
      title: `Booking confirmed: ${origin} → ${destination}`,
      body: `Your ticket is confirmed. PNR ${pnr}, seats ${data.seatNumbers.join(", ")} on bus ${busNumber}.`,
    });
    if (booking.passengerId > 0 && rewardPointsEarned > 0) {
      await createNotification({
        passengerId: booking.passengerId,
        type: "reward",
        title: `You earned ${rewardPointsEarned} reward points`,
        body: `${rewardPointsEarned} points were added for your ${origin} → ${destination} booking. Redeem them for wallet credit anytime.`,
      });
    }
  } catch (err) {
    req.log.error({ err }, "failed to send booking notification");
  }

  return res.status(201).json({
    rewardPointsEarned,
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
  // Surface the AUTHORITATIVE loyalty award (1 pt per ₹10 of the trusted
  // schedule fare) so the UI never has to re-derive it from the recorded
  // totalFare, which can differ for non-wallet payments. Walk-in/counter
  // bookings (sentinel passenger id 0) earn nothing.
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, row.scheduleId));
  const trustedFare = schedule ? Number(schedule.fare) * (row.seatNumbers?.length ?? 0) : 0;
  const rewardPointsEarned = row.passengerId > 0 ? Math.floor(trustedFare / 10) : 0;
  return res.json({ ...row, rewardPointsEarned, totalFare: Number(row.totalFare), createdAt: row.createdAt.toISOString(), seatNumbers: row.seatNumbers ?? [] });
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

    // A booking that was never paid (e.g. an abandoned online payment left it
    // pending) has nothing to refund — just void it without a refund record.
    if (row.paymentStatus !== "paid") {
      const [voided] = await tx.update(bookingsTable)
        .set({ status: "cancelled", paymentStatus: row.paymentStatus })
        .where(eq(bookingsTable.id, id)).returning();
      return voided;
    }

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

  // If this booking was paid online via Razorpay, issue a real refund through
  // the provider. This runs after the DB transaction commits because it is an
  // external network call; the refund record already exists, so a transient
  // provider failure leaves the refund "processing" to be retried, never lost.
  if (updated.status === "cancelled" && updated.paymentStatus === "refund_pending") {
    try {
      const [payment] = await db.select().from(paymentsTable)
        .where(and(eq(paymentsTable.bookingId, updated.id), eq(paymentsTable.kind, "booking")));
      if (payment && payment.status === "paid" && payment.razorpayPaymentId) {
        const refund = await getRazorpayClient().payments.refund(payment.razorpayPaymentId, {
          amount: Math.round(Number(payment.amount) * 100),
          notes: { bookingId: String(updated.id), pnr: updated.pnr },
        });
        await db.update(paymentsTable)
          .set({ status: "refunded", razorpayRefundId: refund.id })
          .where(eq(paymentsTable.id, payment.id));
        await db.update(refundsTable)
          .set({ status: "processing", updatedAt: new Date() })
          .where(eq(refundsTable.bookingId, updated.id));
      }
    } catch (err) {
      req.log.error({ err }, "failed to issue razorpay refund on cancel");
    }
  }

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
  return res.json({ ...row, totalFare: Number(row.totalFare), createdAt: row.createdAt.toISOString(), seatNumbers: row.seatNumbers ?? [] });
});

export default router;
