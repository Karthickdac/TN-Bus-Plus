import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { routesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/routes", async (req, res) => {
  const { origin, destination } = req.query;
  let query = db.select().from(routesTable);
  const rows = await query;
  let filtered = rows;
  if (origin) filtered = filtered.filter(r => r.origin.toLowerCase().includes(String(origin).toLowerCase()));
  if (destination) filtered = filtered.filter(r => r.destination.toLowerCase().includes(String(destination).toLowerCase()));
  res.json(filtered.map(r => ({
    ...r,
    distanceKm: Number(r.distanceKm),
    basefare: Number(r.basefare),
    stops: r.stops ?? [],
  })));
});

router.get("/routes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select().from(routesTable).where(eq(routesTable.id, id));
  if (!row) return res.status(404).json({ error: "Route not found" });
  res.json({ ...row, distanceKm: Number(row.distanceKm), basefare: Number(row.basefare), stops: row.stops ?? [] });
});

export default router;
