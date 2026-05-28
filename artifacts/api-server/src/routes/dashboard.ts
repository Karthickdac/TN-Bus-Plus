import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, routesTable, passengersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  const passengerId = req.query.passengerId ? parseInt(String(req.query.passengerId)) : null;

  if (passengerId) {
    const [passenger] = await db.select().from(passengersTable).where(eq(passengersTable.id, passengerId));
    const allBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.passengerId, passengerId));
    const totalSpent = allBookings.reduce((sum, b) => sum + Number(b.totalFare), 0);
    const upcomingTrips = allBookings.filter(b => b.status === "confirmed").length;

    res.json({
      totalTrips: allBookings.length,
      totalSpent,
      walletBalance: Number(passenger?.walletBalance ?? 0),
      rewardPoints: passenger?.rewardPoints ?? 0,
      upcomingTrips,
      savedRoutes: 3,
    });
  } else {
    res.json({
      totalTrips: 42,
      totalSpent: 8750,
      walletBalance: 500,
      rewardPoints: 320,
      upcomingTrips: 2,
      savedRoutes: 5,
    });
  }
});

router.get("/dashboard/popular-routes", async (_req, res) => {
  const routes = await db.select().from(routesTable).limit(6);
  res.json(routes.map((r, i) => ({
    origin: r.origin,
    destination: r.destination,
    bookingsCount: 120 - i * 15,
    avgFare: Number(r.basefare),
    nextDeparture: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
  })));
});

router.get("/dashboard/upcoming-trips", async (req, res) => {
  const passengerId = req.query.passengerId ? parseInt(String(req.query.passengerId)) : 1;
  const trips = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.passengerId, passengerId));
  const upcoming = trips.filter(b => b.status === "confirmed");
  res.json(upcoming.map(b => ({
    ...b,
    totalFare: Number(b.totalFare),
    createdAt: b.createdAt.toISOString(),
    seatNumbers: b.seatNumbers ?? [],
  })));
});

export default router;
