import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { passengersTable, walletTransactionsTable, bookingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreatePassengerBody, UpdatePassengerBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/passengers", async (req, res) => {
  const parsed = CreatePassengerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  const [passenger] = await db.insert(passengersTable).values({
    name: data.name,
    email: data.email,
    phone: data.phone,
    passwordHash: data.password, // In production, hash this
    walletBalance: "500.00",
    rewardPoints: 0,
  }).returning();

  return res.status(201).json({
    ...passenger,
    walletBalance: Number(passenger.walletBalance),
    createdAt: passenger.createdAt.toISOString(),
  });
});

router.get("/passengers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select().from(passengersTable).where(eq(passengersTable.id, id));
  if (!row) return res.status(404).json({ error: "Passenger not found" });
  return res.json({ ...row, walletBalance: Number(row.walletBalance), createdAt: row.createdAt.toISOString() });
});

router.patch("/passengers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdatePassengerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const [updated] = await db.update(passengersTable).set(parsed.data).where(eq(passengersTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Passenger not found" });
  return res.json({ ...updated, walletBalance: Number(updated.walletBalance), createdAt: updated.createdAt.toISOString() });
});

router.get("/passengers/:id/wallet", async (req, res) => {
  const id = parseInt(req.params.id);
  const [passenger] = await db.select().from(passengersTable).where(eq(passengersTable.id, id));
  if (!passenger) return res.status(404).json({ error: "Passenger not found" });

  const txns = await db.select().from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.passengerId, id))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(20);

  return res.json({
    balance: Number(passenger.walletBalance),
    rewardPoints: passenger.rewardPoints,
    transactions: txns.map(t => ({
      ...t,
      amount: Number(t.amount),
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

export default router;
