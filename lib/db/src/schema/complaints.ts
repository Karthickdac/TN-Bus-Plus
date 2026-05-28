import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").notNull(),
  busNumber: text("bus_number"),
  category: text("category").notNull(), // safety, cleanliness, delay, staff, ticketing, other
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, in-review, resolved, closed
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
