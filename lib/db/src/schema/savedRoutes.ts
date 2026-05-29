import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedRoutesTable = pgTable("saved_routes", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqRoute: unique().on(t.passengerId, t.origin, t.destination),
}));

export const insertSavedRouteSchema = createInsertSchema(savedRoutesTable).omit({ id: true, createdAt: true });
export type InsertSavedRoute = z.infer<typeof insertSavedRouteSchema>;
export type SavedRoute = typeof savedRoutesTable.$inferSelect;
