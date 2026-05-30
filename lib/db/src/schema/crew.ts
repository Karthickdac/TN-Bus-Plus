import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const crewTable = pgTable("crew", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // driver, conductor
  depotId: integer("depot_id"),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  status: text("status").notNull().default("on-duty"), // on-duty, off-duty, leave
  experienceYears: integer("experience_years").notNull().default(0),
  safetyScore: numeric("safety_score", { precision: 4, scale: 2 }).notNull().default("85.00"),
  assignedBusNumber: text("assigned_bus_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrewSchema = createInsertSchema(crewTable).omit({ id: true, createdAt: true });
export type InsertCrew = z.infer<typeof insertCrewSchema>;
export type Crew = typeof crewTable.$inferSelect;
