import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { passengersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
declare module "express-session" {
  interface SessionData {
    passengerId?: number;
  }
}

const router = Router();

function validateSignup(body: unknown): { name: string; email: string; phone: string; password: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || b.name.trim().length < 2) return null;
  if (typeof b.email !== "string" || !b.email.includes("@")) return null;
  if (typeof b.phone !== "string" || b.phone.trim().length < 10) return null;
  if (typeof b.password !== "string" || b.password.length < 6) return null;
  return { name: b.name.trim(), email: b.email.trim().toLowerCase(), phone: b.phone.trim(), password: b.password };
}

function validateLogin(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string" || !b.email.includes("@")) return null;
  if (typeof b.password !== "string" || b.password.length < 1) return null;
  return { email: b.email.trim().toLowerCase(), password: b.password };
}

function safePassenger(p: typeof passengersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = p;
  return rest;
}

router.post("/auth/signup", async (req, res) => {
  const parsed = validateSignup(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input. Name ≥2 chars, valid email, phone ≥10 digits, password ≥6 chars." });
    return;
  }
  const { name, email, phone, password } = parsed;

  const existing = await db
    .select()
    .from(passengersTable)
    .where(eq(passengersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [passenger] = await db
    .insert(passengersTable)
    .values({ name, email, phone, passwordHash })
    .returning();

  req.session.passengerId = passenger.id;
  res.status(201).json(safePassenger(passenger));
});

router.post("/auth/login", async (req, res) => {
  const parsed = validateLogin(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed;

  const [passenger] = await db
    .select()
    .from(passengersTable)
    .where(eq(passengersTable.email, email))
    .limit(1);

  if (!passenger) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, passenger.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.passengerId = passenger.id;
  res.json(safePassenger(passenger));
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
  const id = req.session.passengerId;
  if (!id) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [passenger] = await db
    .select()
    .from(passengersTable)
    .where(eq(passengersTable.id, id))
    .limit(1);

  if (!passenger) {
    res.status(401).json({ error: "Session invalid" });
    return;
  }
  res.json(safePassenger(passenger));
});

export default router;
