import { pgTable, serial, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const routesTable = pgTable("routes", {
  id: serial("id").primaryKey(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distanceKm: numeric("distance_km", { precision: 8, scale: 2 }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  basefare: numeric("basefare", { precision: 8, scale: 2 }).notNull(),
  stops: text("stops").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRouteSchema = createInsertSchema(routesTable).omit({ id: true, createdAt: true });
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routesTable.$inferSelect;
