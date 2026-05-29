import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { refundsTable, bookingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/passengers/:id/refunds", async (req, res) => {
  const passengerId = parseInt(req.params.id);
  const refunds = await db.select().from(refundsTable)
    .where(eq(refundsTable.passengerId, passengerId))
    .orderBy(desc(refundsTable.createdAt));

  const bookingIds = [...new Set(refunds.map(r => r.bookingId))];
  const bookings = bookingIds.length
    ? await db.select().from(bookingsTable)
    : [];
  const bookingMap = new Map(bookings.map(b => [b.id, b]));

  res.json(refunds.map(r => {
    const b = bookingMap.get(r.bookingId);
    return {
      ...r,
      amount: Number(r.amount),
      estimatedDate: r.estimatedDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
      pnr: b?.pnr ?? null,
      origin: b?.origin ?? null,
      destination: b?.destination ?? null,
    };
  }));
});

export default router;
