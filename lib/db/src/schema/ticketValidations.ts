import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketValidationsTable = pgTable("ticket_validations", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id"),
  pnr: text("pnr").notNull(),
  conductorId: integer("conductor_id"),
  busNumber: text("bus_number"),
  scheduleId: integer("schedule_id"),
  seatNumbers: text("seat_numbers").array().default([]),
  // valid, duplicate, cancelled, not_found, mismatch
  result: text("result").notNull(),
  validatedAt: timestamp("validated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTicketValidationSchema = createInsertSchema(ticketValidationsTable).omit({ id: true, createdAt: true });
export type InsertTicketValidation = z.infer<typeof insertTicketValidationSchema>;
export type TicketValidation = typeof ticketValidationsTable.$inferSelect;
