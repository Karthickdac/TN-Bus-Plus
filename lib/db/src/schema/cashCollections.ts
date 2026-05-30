import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cashCollectionsTable = pgTable("cash_collections", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id"),
  busNumber: text("bus_number").notNull(),
  scheduleId: integer("schedule_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  ticketsCount: integer("tickets_count").notNull().default(0),
  notes: text("notes"),
  synced: boolean("synced").notNull().default(true),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
});

export const insertCashCollectionSchema = createInsertSchema(cashCollectionsTable).omit({ id: true, collectedAt: true });
export type InsertCashCollection = z.infer<typeof insertCashCollectionSchema>;
export type CashCollection = typeof cashCollectionsTable.$inferSelect;
