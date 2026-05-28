import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { busLocationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tracking/:busId", async (req, res) => {
  const busId = parseInt(req.params.busId);
  const [row] = await db.select().from(busLocationsTable).where(eq(busLocationsTable.busId, busId));
  if (!row) return res.status(404).json({ error: "Bus location not found" });
  res.json({
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    speed: Number(row.speed),
    heading: Number(row.heading),
    lastUpdated: row.lastUpdated.toISOString(),
  });
});

export default router;
