import { pgTable, serial, integer, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface InspectionItem {
  label: string;
  ok: boolean;
}

export const inspectionsTable = pgTable("inspections", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id"),
  busNumber: text("bus_number").notNull(),
  items: jsonb("items").$type<InspectionItem[]>().notNull().default([]),
  passed: boolean("passed").notNull().default(true),
  notes: text("notes"),
  inspectedAt: timestamp("inspected_at").defaultNow().notNull(),
});

export const insertInspectionSchema = createInsertSchema(inspectionsTable).omit({ id: true, inspectedAt: true });
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspectionsTable.$inferSelect;
