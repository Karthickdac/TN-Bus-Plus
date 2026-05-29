import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const refundsTable = pgTable("refunds", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  passengerId: integer("passenger_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("processing"), // processing, completed
  reason: text("reason"),
  estimatedDate: timestamp("estimated_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRefundSchema = createInsertSchema(refundsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refundsTable.$inferSelect;
