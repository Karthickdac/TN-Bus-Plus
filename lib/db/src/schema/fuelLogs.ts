import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fuelLogsTable = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id"),
  busNumber: text("bus_number").notNull(),
  liters: numeric("liters", { precision: 8, scale: 2 }).notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  odometer: integer("odometer"),
  fuelType: text("fuel_type").notNull().default("diesel"),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const insertFuelLogSchema = createInsertSchema(fuelLogsTable).omit({ id: true, loggedAt: true });
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;
export type FuelLog = typeof fuelLogsTable.$inferSelect;
