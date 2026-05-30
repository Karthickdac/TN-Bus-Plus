import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const busesTable = pgTable("buses", {
  id: serial("id").primaryKey(),
  busNumber: text("bus_number").notNull().unique(),
  busType: text("bus_type").notNull(), // AC, Non-AC, Sleeper, Ultra-Deluxe
  totalSeats: integer("total_seats").notNull(),
  amenities: text("amenities").array().default([]),
  status: text("status").notNull().default("active"), // active, maintenance, breakdown
  currentLocation: text("current_location"),
  punctualityScore: numeric("punctuality_score", { precision: 4, scale: 2 }).default("85.00"),
  driverName: text("driver_name"),
  routeId: integer("route_id"),
  depotId: integer("depot_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBusSchema = createInsertSchema(busesTable).omit({ id: true, createdAt: true });
export type InsertBus = z.infer<typeof insertBusSchema>;
export type Bus = typeof busesTable.$inferSelect;
