import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

// Festival / special alerts that every passenger should see. Seeded once per
// passenger on first fetch (deduped by dedupeKey) so read/unread state is real.
const STANDING_ALERTS: { type: string; title: string; body: string; dedupeKey: string }[] = [
  {
    type: "festival",
    title: "Aadi Perukku special services",
    body: "Extra buses on temple routes for Aadi Perukku. Book early — seats fill fast during the festival rush.",
    dedupeKey: "festival-aadi-perukku",
  },
  {
    type: "festival",
    title: "Pongal 2027 advance booking open",
    body: "Plan your Pongal travel home now. Advance reservations are open on all long-distance routes.",
    dedupeKey: "festival-pongal-2027",
  },
  {
    type: "special",
    title: "Weekend getaway fare drop",
    body: "Enjoy reduced fares on select hill-station routes this weekend. Limited seats at the special price.",
    dedupeKey: "special-weekend-getaway",
  },
];

async function seedStandingAlerts(passengerId: number) {
  const existing = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.passengerId, passengerId));
  const existingKeys = new Set(existing.map(n => n.dedupeKey).filter(Boolean));
  const toInsert = STANDING_ALERTS.filter(a => !existingKeys.has(a.dedupeKey));
  if (toInsert.length > 0) {
    await db.insert(notificationsTable).values(
      toInsert.map(a => ({
        passengerId,
        type: a.type,
        title: a.title,
        body: a.body,
        dedupeKey: a.dedupeKey,
      })),
    );
  }
}

router.get("/passengers/:id/notifications", async (req, res) => {
  const passengerId = parseInt(req.params.id);
  if (passengerId > 0) await seedStandingAlerts(passengerId);
  const rows = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.passengerId, passengerId))
    .orderBy(desc(notificationsTable.createdAt));
  return res.json(rows.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.post("/passengers/:id/notifications/read-all", async (req, res) => {
  const passengerId = parseInt(req.params.id);
  await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.passengerId, passengerId), eq(notificationsTable.isRead, false)));
  const rows = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.passengerId, passengerId))
    .orderBy(desc(notificationsTable.createdAt));
  return res.json(rows.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.post("/notifications/:id/read", async (req, res) => {
  const id = parseInt(req.params.id);
  const [updated] = await db.update(notificationsTable).set({ isRead: true })
    .where(eq(notificationsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Notification not found" });
  return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;
