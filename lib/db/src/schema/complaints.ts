import { pgTable, serial, integer, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
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
  // AI analysis (filled by the complaint analyzer; nullable until analyzed)
  aiCategory: text("ai_category"),
  sentiment: text("sentiment"), // positive, neutral, negative
  sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }), // -1.000..1.000
  escalated: boolean("escalated").notNull().default(false),
  aiSummary: text("ai_summary"),
  aiAnalyzedAt: timestamp("ai_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
