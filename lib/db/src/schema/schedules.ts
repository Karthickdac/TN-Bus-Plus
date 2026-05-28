import { pgTable, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id").notNull(),
  routeId: integer("route_id").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  fare: numeric("fare", { precision: 8, scale: 2 }).notNull(),
  availableSeats: integer("available_seats").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
