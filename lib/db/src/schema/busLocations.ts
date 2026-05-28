import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const busLocationsTable = pgTable("bus_locations", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id").notNull().unique(),
  busNumber: text("bus_number").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  speed: numeric("speed", { precision: 6, scale: 2 }).notNull().default("0"),
  heading: numeric("heading", { precision: 6, scale: 2 }).notNull().default("0"),
  nextStop: text("next_stop"),
  etaMinutes: integer("eta_minutes"),
  status: text("status").notNull().default("on-route"), // on-route, at-stop, delayed, breakdown
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertBusLocationSchema = createInsertSchema(busLocationsTable).omit({ id: true, lastUpdated: true });
export type InsertBusLocation = z.infer<typeof insertBusLocationSchema>;
export type BusLocation = typeof busLocationsTable.$inferSelect;
