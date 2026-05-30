import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, routesTable, passengersTable, savedRoutesTable, schedulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
  const passengerId = req.query.passengerId ? parseInt(String(req.query.passengerId)) : 0;

  const [passenger] = passengerId
    ? await db.select().from(passengersTable).where(eq(passengersTable.id, passengerId))
    : [];

  if (!passenger) {
    res.json({
      totalTrips: 0,
      totalSpent: 0,
      walletBalance: 0,
      rewardPoints: 0,
      upcomingTrips: 0,
      savedRoutes: 0,
    });
    return;
  }

  const allBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.passengerId, passengerId));
  const totalSpent = allBookings.reduce((sum, b) => sum + Number(b.totalFare), 0);
  const upcomingTrips = allBookings.filter(b => b.status === "confirmed").length;
  // Saved routes come from the dedicated saved-routes table the passenger has saved.
  const savedRoutesRows = await db.select().from(savedRoutesTable).where(eq(savedRoutesTable.passengerId, passengerId));

  res.json({
    totalTrips: allBookings.length,
    totalSpent,
    walletBalance: Number(passenger.walletBalance ?? 0),
    rewardPoints: passenger.rewardPoints ?? 0,
    upcomingTrips,
    savedRoutes: savedRoutesRows.length,
  });
});

router.get("/dashboard/popular-routes", async (_req, res) => {
  const routes = await db.select().from(routesTable);
  const bookings = await db.select().from(bookingsTable);
  const schedules = await db.select().from(schedulesTable);
  const now = Date.now();

  const popular = routes.map(r => {
    const routeBookings = bookings.filter(b => b.origin === r.origin && b.destination === r.destination);
    const bookingsCount = routeBookings.length;
    // Average fare actually paid on this route; fall back to the route base fare.
    const avgFare = bookingsCount
      ? routeBookings.reduce((sum, b) => sum + Number(b.totalFare), 0) / bookingsCount
      : Number(r.basefare);
    // Next real upcoming departure from the schedule table.
    const nextSchedule = schedules
      .filter(s => s.routeId === r.id && s.departureTime.getTime() >= now)
      .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime())[0];
    return {
      origin: r.origin,
      destination: r.destination,
      bookingsCount,
      avgFare,
      ...(nextSchedule ? { nextDeparture: nextSchedule.departureTime.toISOString() } : {}),
    };
  });

  popular.sort((a, b) => b.bookingsCount - a.bookingsCount);
  res.json(popular.slice(0, 6));
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
