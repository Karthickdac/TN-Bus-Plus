import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  totalFare: numeric("total_fare", { precision: 10, scale: 2 }).notNull(),
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
