import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maintenanceRecordsTable = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id").notNull(),
  type: text("type").notNull(), // service, repair, tyre, oil-change, bodywork, other
  description: text("description"),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  odometer: integer("odometer"),
  status: text("status").notNull().default("completed"), // scheduled, in-progress, completed
  serviceDate: timestamp("service_date").notNull().defaultNow(),
  nextServiceDue: timestamp("next_service_due"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type MaintenanceRecord = typeof maintenanceRecordsTable.$inferSelect;
