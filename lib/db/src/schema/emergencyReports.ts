import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emergencyReportsTable = pgTable("emergency_reports", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id"),
  busNumber: text("bus_number").notNull(),
  // breakdown, accident, medical, security, other
  type: text("type").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  // low, medium, high, critical
  severity: text("severity").notNull().default("medium"),
  // open, acknowledged, resolved
  status: text("status").notNull().default("open"),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
});

export const insertEmergencyReportSchema = createInsertSchema(emergencyReportsTable).omit({ id: true, reportedAt: true });
export type InsertEmergencyReport = z.infer<typeof insertEmergencyReportSchema>;
export type EmergencyReport = typeof emergencyReportsTable.$inferSelect;
