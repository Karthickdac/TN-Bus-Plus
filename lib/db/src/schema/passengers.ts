import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const passengersTable = pgTable("passengers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).notNull().default("500.00"),
  rewardPoints: integer("reward_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPassengerSchema = createInsertSchema(passengersTable).omit({ id: true, createdAt: true });
export type InsertPassenger = z.infer<typeof insertPassengerSchema>;
export type Passenger = typeof passengersTable.$inferSelect;
