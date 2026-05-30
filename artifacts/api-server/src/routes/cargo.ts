import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { db, cargoBookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCargoBookingBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

// Tracking IDs are returned on an UNAUTHENTICATED endpoint that exposes
// sender/receiver contact details, so they must be unguessable. Use 5 random
// bytes (~1 trillion values) rendered as uppercase base36 rather than a
// predictable timestamp, so they can't be enumerated to scrape parcel PII.
function generateTrackingId(): string {
  const rand = parseInt(randomBytes(5).toString("hex"), 16)
    .toString(36)
    .toUpperCase()
    .padStart(8, "0");
  return "CGO" + rand;
}

// Parcel charge is computed server-side so it can't be tampered with: a flat
// handling fee plus a per-kg rate, with a surcharge for parcel types that need
// careful handling. Delivery is estimated at 2 days on the bus network.
const BASE_HANDLING = 50;
const PER_KG = 15;
const TYPE_SURCHARGE: Record<string, number> = {
  document: 0,
  package: 0,
  fragile: 60,
  electronics: 80,
  other: 0,
};

function computeCargoCharge(weightKg: number, parcelType: string): number {
  const weight = Math.max(0.5, weightKg);
  const surcharge = TYPE_SURCHARGE[parcelType] ?? 0;
  const charge = BASE_HANDLING + PER_KG * weight + surcharge;
  return Math.round(charge * 100) / 100;
}

router.post("/cargo", async (req, res) => {
  const parsed = CreateCargoBookingBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  const weightKg = Number(data.weightKg);
  if (!(weightKg > 0)) return res.status(400).json({ error: "Weight must be greater than zero." });
  if (weightKg > 100) return res.status(400).json({ error: "Parcels over 100 kg must be booked at a depot counter." });
  if (data.origin.trim().toLowerCase() === data.destination.trim().toLowerCase()) {
    return res.status(400).json({ error: "Origin and destination must be different." });
  }

  const charge = computeCargoCharge(weightKg, data.parcelType);
  const trackingId = generateTrackingId();
  const estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  // Link the parcel to the signed-in passenger when there is a session, so it
  // shows up in their history; walk-in senders book without an account.
  const passengerId = req.session?.passengerId ?? null;

  const [row] = await db.insert(cargoBookingsTable).values({
    trackingId,
    passengerId,
    senderName: data.senderName,
    senderPhone: data.senderPhone,
    receiverName: data.receiverName,
    receiverPhone: data.receiverPhone,
    origin: data.origin,
    destination: data.destination,
    parcelType: data.parcelType,
    weightKg: String(weightKg),
    description: data.description ?? null,
    charge: String(charge),
    status: "booked",
    estimatedDelivery,
  }).returning();

  if (passengerId) {
    try {
      await createNotification({
        passengerId,
        type: "booking",
        title: `Parcel booked: ${data.origin} → ${data.destination}`,
        body: `Your parcel is booked. Tracking ID ${trackingId}. Charge ₹${charge.toFixed(2)}, estimated delivery in 2 days.`,
      });
    } catch (err) {
      req.log.error({ err }, "failed to send cargo booking notification");
    }
  }

  return res.status(201).json(serializeCargo(row));
});

router.get("/cargo/:trackingId", async (req, res) => {
  const [row] = await db.select().from(cargoBookingsTable)
    .where(eq(cargoBookingsTable.trackingId, req.params.trackingId.trim().toUpperCase()));
  if (!row) return res.status(404).json({ error: "No parcel found for that tracking ID." });
  return res.json(serializeCargo(row));
});

function serializeCargo(row: typeof cargoBookingsTable.$inferSelect) {
  return {
    ...row,
    weightKg: Number(row.weightKg),
    charge: Number(row.charge),
    estimatedDelivery: row.estimatedDelivery.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
