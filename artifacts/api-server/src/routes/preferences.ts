import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdatePreferencesBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/passengers/:id/preferences", async (req, res) => {
  const passengerId = parseInt(req.params.id);
  const [row] = await db.select().from(userPreferencesTable)
    .where(eq(userPreferencesTable.passengerId, passengerId));
  res.json({
    passengerId,
    preferredSeatType: row?.preferredSeatType ?? null,
    preferredBusType: row?.preferredBusType ?? null,
  });
});

router.put("/passengers/:id/preferences", async (req, res) => {
  const passengerId = parseInt(req.params.id);
  const parsed = UpdatePreferencesBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  const [existing] = await db.select().from(userPreferencesTable)
    .where(eq(userPreferencesTable.passengerId, passengerId));

  let row;
  if (existing) {
    [row] = await db.update(userPreferencesTable).set({
      preferredSeatType: data.preferredSeatType ?? null,
      preferredBusType: data.preferredBusType ?? null,
      updatedAt: new Date(),
    }).where(eq(userPreferencesTable.passengerId, passengerId)).returning();
  } else {
    [row] = await db.insert(userPreferencesTable).values({
      passengerId,
      preferredSeatType: data.preferredSeatType ?? null,
      preferredBusType: data.preferredBusType ?? null,
    }).returning();
  }

  return res.json({
    passengerId: row.passengerId,
    preferredSeatType: row.preferredSeatType ?? null,
    preferredBusType: row.preferredBusType ?? null,
  });
});

export default router;
