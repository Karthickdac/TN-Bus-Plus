import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { savedRoutesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateSavedRouteBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/passengers/:id/saved-routes", async (req, res) => {
  const passengerId = parseInt(req.params.id);
  const rows = await db.select().from(savedRoutesTable)
    .where(eq(savedRoutesTable.passengerId, passengerId))
    .orderBy(desc(savedRoutesTable.createdAt));
  return res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/saved-routes", async (req, res) => {
  const parsed = CreateSavedRouteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  const existing = await db.select().from(savedRoutesTable).where(and(
    eq(savedRoutesTable.passengerId, data.passengerId),
    eq(savedRoutesTable.origin, data.origin),
    eq(savedRoutesTable.destination, data.destination),
  ));
  if (existing[0]) {
    return res.status(201).json({ ...existing[0], createdAt: existing[0].createdAt.toISOString() });
  }

  const [row] = await db.insert(savedRoutesTable).values({
    passengerId: data.passengerId,
    origin: data.origin,
    destination: data.destination,
  }).returning();
  return res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/saved-routes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(savedRoutesTable).where(eq(savedRoutesTable.id, id));
  return res.status(204).end();
});

export default router;
