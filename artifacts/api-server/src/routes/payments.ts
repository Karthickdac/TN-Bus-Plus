import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  schedulesTable,
  busesTable,
  routesTable,
  passengersTable,
  walletTransactionsTable,
  paymentsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateBookingOrderBody, CreateWalletTopUpOrderBody, VerifyPaymentBody } from "@workspace/api-zod";
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from "../lib/razorpay";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

function generatePnr(): string {
  return "TN" + Date.now().toString().slice(-8).toUpperCase();
}

// Smallest currency unit (paise) is what Razorpay charges in. Rounding keeps us
// on whole paise so the order amount and the recorded rupee amount never drift.
function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

// Create a PENDING booking plus a Razorpay order for its fare. The booking is
// only confirmed later, in /payments/verify, once the signed payment proof
// arrives — so an abandoned or failed payment simply leaves an unconfirmed
// booking (and, since seats are never decremented here, no seat is held).
router.post("/bookings/checkout-order", async (req, res) => {
  if (!isRazorpayConfigured()) {
    return res.status(503).json({ error: "Online payments are not available right now." });
  }
  const parsed = CreateBookingOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  // Online payment confirms a booking against a real account (rewards, refunds,
  // history), so it must be initiated by the signed-in passenger. The booking is
  // tied to the SESSION passenger, never a client-supplied id, so a caller can
  // never create a paid booking under someone else's account.
  const sessionPassengerId = req.session?.passengerId;
  if (!sessionPassengerId) {
    return res.status(401).json({ error: "Please sign in to pay for your booking." });
  }

  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, data.scheduleId));
  if (!schedule) return res.status(404).json({ error: "Schedule not found" });
  const bus = (await db.select().from(busesTable).where(eq(busesTable.id, schedule.busId)))[0] ?? null;
  const route = (await db.select().from(routesTable).where(eq(routesTable.id, schedule.routeId)))[0] ?? null;

  // Charge the AUTHORITATIVE server-side fare (schedule price × seats) so a
  // client can never pay a tampered amount for a real ticket.
  const trustedFare = Number(schedule.fare) * data.seatNumbers.length;
  if (!(trustedFare > 0)) {
    return res.status(400).json({ error: "This fare cannot be paid online." });
  }

  const pnr = generatePnr();
  const origin = route?.origin ?? "Chennai";
  const destination = route?.destination ?? "Madurai";
  const busNumber = bus?.busNumber ?? "TN-XXX";

  let orderId: string;
  try {
    const order = await getRazorpayClient().orders.create({
      amount: toPaise(trustedFare),
      currency: "INR",
      receipt: pnr,
      notes: { kind: "booking", pnr },
    });
    orderId = order.id;
  } catch (err) {
    req.log.error({ err }, "failed to create razorpay order for booking");
    return res.status(502).json({ error: "Could not start the payment. Please try again." });
  }

  const [booking] = await db.insert(bookingsTable).values({
    pnr,
    passengerId: sessionPassengerId,
    scheduleId: data.scheduleId,
    busNumber,
    origin,
    destination,
    departureTime: schedule.departureTime.toISOString(),
    arrivalTime: schedule.arrivalTime.toISOString(),
    seatNumbers: data.seatNumbers,
    totalFare: String(trustedFare),
    status: "pending_payment",
    paymentStatus: "pending",
    passengerName: data.passengerName,
    passengerPhone: data.passengerPhone,
  }).returning();

  await db.insert(paymentsTable).values({
    razorpayOrderId: orderId,
    passengerId: sessionPassengerId,
    kind: "booking",
    amount: String(trustedFare),
    currency: "INR",
    status: "created",
    bookingId: booking.id,
  });

  return res.status(201).json({
    orderId,
    amount: trustedFare,
    currency: "INR",
    keyId: getRazorpayKeyId(),
    kind: "booking",
    bookingId: booking.id,
    name: "TN Bus+",
    description: `${origin} → ${destination} · ${data.seatNumbers.join(", ")}`,
  });
});

// Create a Razorpay order to add money to a wallet. Top-ups move stored value
// into a specific account, so they must be initiated by that signed-in account.
router.post("/passengers/:id/wallet/topup-order", async (req, res) => {
  if (!isRazorpayConfigured()) {
    return res.status(503).json({ error: "Online payments are not available right now." });
  }
  const id = parseInt(req.params.id);
  const parsed = CreateWalletTopUpOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const sessionPassengerId = req.session?.passengerId;
  if (!sessionPassengerId) {
    return res.status(401).json({ error: "Please sign in to top up your wallet." });
  }
  if (sessionPassengerId !== id) {
    return res.status(403).json({ error: "You can only top up your own wallet." });
  }

  const amount = parsed.data.amount;
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return res.status(400).json({ error: "Enter an amount between ₹1 and ₹1,00,000." });
  }

  const [passenger] = await db.select().from(passengersTable).where(eq(passengersTable.id, id));
  if (!passenger) return res.status(404).json({ error: "Passenger not found" });

  let orderId: string;
  try {
    const order = await getRazorpayClient().orders.create({
      amount: toPaise(amount),
      currency: "INR",
      receipt: `wallet-${id}-${Date.now()}`,
      notes: { kind: "wallet_topup", passengerId: String(id) },
    });
    orderId = order.id;
  } catch (err) {
    req.log.error({ err }, "failed to create razorpay order for wallet topup");
    return res.status(502).json({ error: "Could not start the payment. Please try again." });
  }

  await db.insert(paymentsTable).values({
    razorpayOrderId: orderId,
    passengerId: id,
    kind: "wallet_topup",
    amount: String(amount),
    currency: "INR",
    status: "created",
  });

  return res.status(201).json({
    orderId,
    amount,
    currency: "INR",
    keyId: getRazorpayKeyId(),
    kind: "wallet_topup",
    bookingId: null,
    name: "TN Bus+ Wallet",
    description: `Add ₹${amount.toFixed(2)} to wallet`,
  });
});

// Verify a completed Razorpay payment and apply its effect exactly once. The
// signature is cryptographic proof the payment succeeded, so confirmation
// happens here rather than trusting a webhook. The payments row is the
// idempotency anchor: once it is "paid", a repeat verify is a safe no-op.
router.post("/payments/verify", async (req, res) => {
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const valid = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) return res.status(400).json({ error: "Payment could not be verified." });

  const [payment] = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.razorpayOrderId, razorpayOrderId));
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  // Ownership guard: even with a valid signature, the credit/confirmation must
  // only be triggerable by the account that owns this payment, so one passenger
  // can never act on another's order.
  const sessionPassengerId = req.session?.passengerId;
  if (!sessionPassengerId || sessionPassengerId !== payment.passengerId) {
    return res.status(403).json({ error: "You can only verify your own payment." });
  }

  // Already applied — idempotent success.
  if (payment.status === "paid" || payment.status === "refunded") {
    return res.json({ status: "paid", kind: payment.kind, bookingId: payment.bookingId ?? null });
  }

  if (payment.kind === "booking") {
    const result = await db.transaction(async (tx) => {
      // Re-read under lock to avoid double-applying a concurrent verify.
      const [locked] = await tx.select().from(paymentsTable)
        .where(eq(paymentsTable.id, payment.id)).for("update");
      if (!locked || locked.status === "paid") return { already: true as const };

      const bookingId = locked.bookingId;
      if (!bookingId) return { error: "no_booking" as const };
      const [booking] = await tx.select().from(bookingsTable)
        .where(eq(bookingsTable.id, bookingId)).for("update");
      if (!booking) return { error: "no_booking" as const };

      // The booking was cancelled/changed before this (possibly delayed) verify
      // arrived, yet the payment still succeeded. Never resurrect it — record the
      // payment as paid and flag it so captured money is refunded rather than
      // kept without a valid ticket.
      if (booking.status !== "pending_payment") {
        await tx.update(paymentsTable)
          .set({ status: "paid", razorpayPaymentId, processedAt: new Date() })
          .where(eq(paymentsTable.id, locked.id));
        return { stale: true as const, booking };
      }

      const [confirmed] = await tx.update(bookingsTable)
        .set({ status: "confirmed", paymentStatus: "paid" })
        .where(eq(bookingsTable.id, bookingId)).returning();

      // Loyalty: 1 point per ₹10 of the trusted fare, for registered accounts.
      const [schedule] = await tx.select().from(schedulesTable).where(eq(schedulesTable.id, confirmed.scheduleId));
      const trustedFare = schedule ? Number(schedule.fare) * (confirmed.seatNumbers?.length ?? 0) : 0;
      const rewardPointsEarned = confirmed.passengerId > 0 ? Math.floor(trustedFare / 10) : 0;
      if (rewardPointsEarned > 0) {
        await tx.update(passengersTable)
          .set({ rewardPoints: sql`${passengersTable.rewardPoints} + ${rewardPointsEarned}` })
          .where(eq(passengersTable.id, confirmed.passengerId));
      }

      await tx.update(paymentsTable)
        .set({ status: "paid", razorpayPaymentId, processedAt: new Date() })
        .where(eq(paymentsTable.id, locked.id));

      return { ok: true as const, booking: confirmed, rewardPointsEarned };
    });

    if ("error" in result && result.error === "no_booking") {
      return res.status(404).json({ error: "Booking not found" });
    }
    // Booking was no longer active when the payment landed. Refund the captured
    // amount through Razorpay (best-effort, after commit) so the passenger is
    // made whole; the payment row is already marked paid for idempotency.
    if ("stale" in result && result.stale) {
      try {
        const refund = await getRazorpayClient().payments.refund(razorpayPaymentId, {
          amount: toPaise(Number(payment.amount)),
          notes: { bookingId: String(result.booking.id), pnr: result.booking.pnr },
        });
        await db.update(paymentsTable)
          .set({ status: "refunded", razorpayRefundId: refund.id })
          .where(eq(paymentsTable.id, payment.id));
      } catch (err) {
        req.log.error({ err }, "failed to refund payment for inactive booking");
      }
      return res.status(409).json({
        status: "refunded",
        kind: "booking",
        bookingId: result.booking.id,
        error: "This booking was no longer active, so your payment is being refunded.",
      });
    }
    if ("ok" in result && result.ok) {
      const b = result.booking;
      try {
        await createNotification({
          passengerId: b.passengerId,
          type: "booking",
          title: `Booking confirmed: ${b.origin} → ${b.destination}`,
          body: `Payment received. PNR ${b.pnr}, seats ${(b.seatNumbers ?? []).join(", ")} on bus ${b.busNumber}.`,
        });
        if (result.rewardPointsEarned > 0) {
          await createNotification({
            passengerId: b.passengerId,
            type: "reward",
            title: `You earned ${result.rewardPointsEarned} reward points`,
            body: `${result.rewardPointsEarned} points were added for your ${b.origin} → ${b.destination} booking.`,
          });
        }
      } catch (err) {
        req.log.error({ err }, "failed to send booking notification after payment");
      }
    }
    return res.json({ status: "paid", kind: "booking", bookingId: payment.bookingId ?? null });
  }

  // Wallet top-up: credit the balance and record the transaction atomically.
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id)).for("update");
    if (!locked || locked.status === "paid") return;

    await tx.update(passengersTable)
      .set({ walletBalance: sql`${passengersTable.walletBalance} + ${Number(locked.amount)}` })
      .where(eq(passengersTable.id, locked.passengerId));
    await tx.insert(walletTransactionsTable).values({
      passengerId: locked.passengerId,
      amount: locked.amount,
      type: "credit",
      description: "Wallet top-up",
    });
    await tx.update(paymentsTable)
      .set({ status: "paid", razorpayPaymentId, processedAt: new Date() })
      .where(eq(paymentsTable.id, locked.id));
  });

  return res.json({ status: "paid", kind: "wallet_topup", bookingId: null });
});

export default router;
