import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const passesTable = pgTable("passes", {
  id: serial("id").primaryKey(),
  passengerId: integer("passenger_id").notNull(),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // monthly, student
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  subsidyAmount: numeric("subsidy_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"), // active, expired
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPassSchema = createInsertSchema(passesTable).omit({ id: true, createdAt: true });
export type InsertPass = z.infer<typeof insertPassSchema>;
export type Pass = typeof passesTable.$inferSelect;
