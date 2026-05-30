import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const depotsTable = pgTable("depots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  city: text("city").notNull(),
  latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
  manager: text("manager"),
  capacity: integer("capacity").notNull().default(50),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepotSchema = createInsertSchema(depotsTable).omit({ id: true, createdAt: true });
export type InsertDepot = z.infer<typeof insertDepotSchema>;
export type Depot = typeof depotsTable.$inferSelect;
