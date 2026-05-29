import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { passengersTable, walletTransactionsTable, passesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { TopUpWalletBody, RedeemRewardPointsBody, PurchasePassBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

// Reward points convert to wallet credit at a fixed rate (1 point = ₹1).
const POINT_VALUE_RUPEES = 1;

// These endpoints move real stored value (wallet balance, reward points,
// pass purchases), so they must be locked to the signed-in owner. Without
// this a caller could top up, drain, or buy passes against another
// passenger's wallet just by changing the :id in the URL (IDOR).
function requireOwner(req: { session?: { passengerId?: number } }, res: import("express").Response, id: number): boolean {
  const sessionId = req.session?.passengerId;
  if (!sessionId) {
    res.status(401).json({ error: "Please sign in to continue." });
    return false;
  }
  if (sessionId !== id) {
    res.status(403).json({ error: "You can only manage your own wallet and passes." });
    return false;
  }
  return true;
}

// Static pass catalogue. Government bus passes are heavily subsidised, so each
// product carries a real subsidy that reduces what the passenger actually pays.
interface PassProductDef {
  id: string;
  name: string;
  category: "monthly" | "student";
  description: string;
  durationDays: number;
  price: number;
  subsidyAmount: number;
  benefits: string[];
}

const PASS_PRODUCTS: PassProductDef[] = [
  {
    id: "monthly-city",
    name: "Monthly City Pass",
    category: "monthly",
    description: "Unlimited travel on all city & town services within Tamil Nadu for 30 days.",
    durationDays: 30,
    price: 1200,
    subsidyAmount: 300,
    benefits: ["Unlimited city rides", "Priority boarding", "No booking fees"],
  },
  {
    id: "monthly-intercity",
    name: "Monthly Intercity Pass",
    category: "monthly",
    description: "Travel across districts on ordinary & express intercity routes for 30 days.",
    durationDays: 30,
    price: 2400,
    subsidyAmount: 600,
    benefits: ["Intercity & district routes", "10 long-distance trips / month", "Free seat selection"],
  },
  {
    id: "student-monthly",
    name: "Student Concession Pass",
    category: "student",
    description: "Subsidised monthly pass for students travelling to college & school.",
    durationDays: 30,
    price: 400,
    subsidyAmount: 250,
    benefits: ["All city routes", "Valid with student ID", "Govt. education subsidy"],
  },
  {
    id: "student-quarterly",
    name: "Student Term Pass",
    category: "student",
    description: "90-day concession pass that covers a full academic term.",
    durationDays: 90,
    price: 1050,
    subsidyAmount: 700,
    benefits: ["Full-term coverage", "Best value for students", "Valid with student ID"],
  },
];

function serializeProduct(p: PassProductDef) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    durationDays: p.durationDays,
    price: p.price,
    subsidyAmount: p.subsidyAmount,
    netPrice: p.price - p.subsidyAmount,
    benefits: p.benefits,
  };
}

function serializePass(row: typeof passesTable.$inferSelect) {
  return {
    ...row,
    price: Number(row.price),
    subsidyAmount: Number(row.subsidyAmount),
    amountPaid: Number(row.amountPaid),
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
    createdAt: row.createdAt.toISOString(),
    status: row.validUntil.getTime() < Date.now() ? "expired" : row.status,
  };
}

async function buildWalletResponse(passengerId: number) {
  const [passenger] = await db.select().from(passengersTable).where(eq(passengersTable.id, passengerId));
  if (!passenger) return null;
  const txns = await db.select().from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.passengerId, passengerId))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(20);
  return {
    balance: Number(passenger.walletBalance),
    rewardPoints: passenger.rewardPoints,
    transactions: txns.map(t => ({ ...t, amount: Number(t.amount), createdAt: t.createdAt.toISOString() })),
  };
}

// Add money to the wallet. Real settlement happens via the (future) payment
// gateway; here we treat the top-up as already paid and just credit the wallet.
router.post("/passengers/:id/wallet/topup", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!requireOwner(req, res, id)) return;
  const parsed = TopUpWalletBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const amount = Number(parsed.data.amount);
  if (!(amount > 0)) return res.status(400).json({ error: "Amount must be greater than zero" });
  if (amount > 50000) return res.status(400).json({ error: "Top-up amount exceeds the ₹50,000 limit" });

  const method = parsed.data.method?.trim() || "UPI";

  const ok = await db.transaction(async (tx) => {
    const [passenger] = await tx.select().from(passengersTable)
      .where(eq(passengersTable.id, id)).for("update");
    if (!passenger) return false;
    await tx.update(passengersTable)
      .set({ walletBalance: sql`${passengersTable.walletBalance} + ${amount}` })
      .where(eq(passengersTable.id, id));
    await tx.insert(walletTransactionsTable).values({
      passengerId: id,
      amount: String(amount),
      type: "credit",
      description: `Wallet top-up via ${method}`,
    });
    return true;
  });

  if (!ok) return res.status(404).json({ error: "Passenger not found" });
  const wallet = await buildWalletResponse(id);
  return res.json(wallet);
});

// Redeem reward points for wallet credit, which can then be spent on fares.
router.post("/passengers/:id/rewards/redeem", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!requireOwner(req, res, id)) return;
  const parsed = RedeemRewardPointsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const points = Math.floor(Number(parsed.data.points));
  if (!(points > 0)) return res.status(400).json({ error: "Points must be greater than zero" });

  const result = await db.transaction(async (tx) => {
    const [passenger] = await tx.select().from(passengersTable)
      .where(eq(passengersTable.id, id)).for("update");
    if (!passenger) return { error: "not_found" as const };
    if (passenger.rewardPoints < points) return { error: "insufficient" as const };

    const credit = points * POINT_VALUE_RUPEES;
    await tx.update(passengersTable)
      .set({
        rewardPoints: sql`${passengersTable.rewardPoints} - ${points}`,
        walletBalance: sql`${passengersTable.walletBalance} + ${credit}`,
      })
      .where(eq(passengersTable.id, id));
    await tx.insert(walletTransactionsTable).values({
      passengerId: id,
      amount: String(credit),
      type: "credit",
      description: `Redeemed ${points} reward points`,
    });
    return { ok: true as const };
  });

  if (result.error === "not_found") return res.status(404).json({ error: "Passenger not found" });
  if (result.error === "insufficient") return res.status(400).json({ error: "Not enough reward points" });
  const wallet = await buildWalletResponse(id);
  return res.json(wallet);
});

router.get("/pass-products", async (_req, res) => {
  res.json(PASS_PRODUCTS.map(serializeProduct));
});

router.get("/passengers/:id/passes", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!requireOwner(req, res, id)) return;
  const rows = await db.select().from(passesTable)
    .where(eq(passesTable.passengerId, id))
    .orderBy(desc(passesTable.createdAt));
  res.json(rows.map(serializePass));
});

// Purchase a pass. Paid from the wallet so loyalty, top-ups and passes all
// share one stored-value system. Wrapped in a transaction so the wallet debit,
// the transaction record and the pass row are created atomically.
router.post("/passengers/:id/passes", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!requireOwner(req, res, id)) return;
  const parsed = PurchasePassBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const product = PASS_PRODUCTS.find(p => p.id === parsed.data.productId);
  if (!product) return res.status(404).json({ error: "Pass product not found" });
  const netPrice = product.price - product.subsidyAmount;

  const result = await db.transaction(async (tx) => {
    const [passenger] = await tx.select().from(passengersTable)
      .where(eq(passengersTable.id, id)).for("update");
    if (!passenger) return { error: "not_found" as const };
    if (Number(passenger.walletBalance) < netPrice) return { error: "insufficient" as const };

    await tx.update(passengersTable)
      .set({ walletBalance: sql`${passengersTable.walletBalance} - ${netPrice}` })
      .where(eq(passengersTable.id, id));
    await tx.insert(walletTransactionsTable).values({
      passengerId: id,
      amount: String(netPrice),
      type: "debit",
      description: `Purchased ${product.name}`,
    });

    const now = new Date();
    const validUntil = new Date(now.getTime() + product.durationDays * 24 * 60 * 60 * 1000);
    const [pass] = await tx.insert(passesTable).values({
      passengerId: id,
      productId: product.id,
      name: product.name,
      category: product.category,
      price: String(product.price),
      subsidyAmount: String(product.subsidyAmount),
      amountPaid: String(netPrice),
      validFrom: now,
      validUntil,
      status: "active",
    }).returning();
    return { ok: true as const, pass };
  });

  if (result.error === "not_found") return res.status(404).json({ error: "Passenger not found" });
  if (result.error === "insufficient")
    return res.status(400).json({ error: "Insufficient wallet balance. Please top up your wallet." });

  // Best-effort: the purchase has already committed, so a failed
  // notification must not turn a successful purchase into a 500.
  try {
    await createNotification({
      passengerId: id,
      type: "pass",
      title: `${product.name} activated`,
      body: `Your ${product.name} is now active and valid for ${product.durationDays} days. A government subsidy of ₹${product.subsidyAmount.toFixed(2)} was applied.`,
    });
  } catch (err) {
    req.log.error({ err }, "failed to send pass purchase notification");
  }

  return res.status(201).json(serializePass(result.pass));
});

export default router;
