import { pgTable, serial, integer, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Per-seat co-passenger for group/family bookings. One entry per seat carries
// the named traveller and their gender, which is what women-only seat
// enforcement is checked against. Stored as JSONB so a single booking row keeps
// all travellers under one PNR.
export type CoPassenger = {
  seatNumber: string;
  name: string;
  gender: "male" | "female" | "other";
};

// A resolved checkout add-on stored on the booking. The server resolves each
// selected add-on against the static catalogue and records the name + price it
// charged, so the booking is a self-contained record even if the catalogue later
// changes. `kind` is "insurance" or "food"; `lineTotal` = price × qty.
export type BookingAddOn = {
  id: string;
  kind: "insurance" | "food";
  name: string;
  price: number;
  qty: number;
  lineTotal: number;
};

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  pnr: text("pnr").notNull().unique(),
  passengerId: integer("passenger_id").notNull(),
  scheduleId: integer("schedule_id").notNull(),
  busNumber: text("bus_number").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departureTime: text("departure_time").notNull(),
  arrivalTime: text("arrival_time").notNull(),
  seatNumbers: text("seat_numbers").array().notNull(),
  coPassengers: jsonb("co_passengers").$type<CoPassenger[]>().notNull().default([]),
  totalFare: numeric("total_fare", { precision: 10, scale: 2 }).notNull(),
  // Offer + add-on extras applied at checkout, all computed server-side.
  promoCode: text("promo_code"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  addOns: jsonb("add_ons").$type<BookingAddOn[]>().notNull().default([]),
  addOnsTotal: numeric("add_ons_total", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("confirmed"), // confirmed, cancelled, completed
  paymentStatus: text("payment_status").notNull().default("paid"), // paid, pending, refunded
  passengerName: text("passenger_name").notNull(),
  passengerPhone: text("passenger_phone").notNull(),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
