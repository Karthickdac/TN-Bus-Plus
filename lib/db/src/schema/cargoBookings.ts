import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Parcel / cargo bookings sent on the bus network. A cargo booking is not tied
// to a seat or schedule — it is a point-to-point parcel handoff between depots.
// passengerId is nullable so a walk-in sender (no account) can still book; when
// present it links the parcel to a signed-in passenger for their history.
export const cargoBookingsTable = pgTable("cargo_bookings", {
  id: serial("id").primaryKey(),
  trackingId: text("tracking_id").notNull().unique(),
  passengerId: integer("passenger_id"),
  senderName: text("sender_name").notNull(),
  senderPhone: text("sender_phone").notNull(),
  receiverName: text("receiver_name").notNull(),
  receiverPhone: text("receiver_phone").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  parcelType: text("parcel_type").notNull(), // document, package, fragile, electronics, other
  weightKg: numeric("weight_kg", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  charge: numeric("charge", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("booked"), // booked, in_transit, arrived, delivered
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertCargoBookingSchema = createInsertSchema(cargoBookingsTable).omit({ id: true, createdAt: true });
export type InsertCargoBooking = z.infer<typeof insertCargoBookingSchema>;
export type CargoBooking = typeof cargoBookingsTable.$inferSelect;
