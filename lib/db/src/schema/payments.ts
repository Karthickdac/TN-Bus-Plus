import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Tracks money that moves through the external payment provider (Razorpay).
// One row per Razorpay order. `kind` distinguishes a bus-fare payment (linked
// to a pending booking) from a wallet top-up. The row is the idempotency
// anchor for verification: once `status` is "paid" the booking/credit has been
// applied and a repeat verify is a no-op.
export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  razorpayOrderId: text("razorpay_order_id").notNull().unique(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpayRefundId: text("razorpay_refund_id"),
  passengerId: integer("passenger_id").notNull(),
  kind: text("kind").notNull(), // booking, wallet_topup
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"), // created, paid, failed, refunded
  bookingId: integer("booking_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
