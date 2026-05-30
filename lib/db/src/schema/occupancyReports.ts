import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const occupancyReportsTable = pgTable("occupancy_reports", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id"),
  busNumber: text("bus_number").notNull(),
  scheduleId: integer("schedule_id"),
  occupancy: integer("occupancy").notNull(),
  capacity: integer("capacity").notNull(),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
});

export const insertOccupancyReportSchema = createInsertSchema(occupancyReportsTable).omit({ id: true, reportedAt: true });
export type InsertOccupancyReport = z.infer<typeof insertOccupancyReportSchema>;
export type OccupancyReport = typeof occupancyReportsTable.$inferSelect;
