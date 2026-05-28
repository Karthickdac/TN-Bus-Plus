import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, busesTable, routesTable, passengersTable, complaintsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateComplaintBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res) => {
  const buses = await db.select().from(busesTable);
  const bookings = await db.select().from(bookingsTable);
  const passengers = await db.select().from(passengersTable);
  const routes = await db.select().from(routesTable);
  const complaints = await db.select().from(complaintsTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBookings = bookings.filter(b => b.createdAt >= today);
  const revenueToday = todayBookings.reduce((sum, b) => sum + Number(b.totalFare), 0);

  res.json({
    totalBuses: buses.length,
    activeBuses: buses.filter(b => b.status === "active").length,
    totalBookingsToday: todayBookings.length,
    revenueToday,
    totalPassengers: passengers.length,
    activeRoutes: routes.length,
    pendingComplaints: complaints.filter(c => c.status === "open").length,
    onTimePercentage: 87.4,
  });
});

router.get("/admin/buses", async (_req, res) => {
  const rows = await db.select().from(busesTable);
  res.json(rows.map(b => ({ ...b, punctualityScore: Number(b.punctualityScore), amenities: b.amenities ?? [] })));
});

router.get("/admin/bookings", async (req, res) => {
  const { status } = req.query;
  let rows = await db.select().from(bookingsTable);
  if (status) rows = rows.filter(b => b.status === String(status));
  res.json(rows.map(b => ({
    ...b,
    totalFare: Number(b.totalFare),
    createdAt: b.createdAt.toISOString(),
    seatNumbers: b.seatNumbers ?? [],
  })));
});

router.get("/admin/revenue", async (req, res) => {
  const bookings = await db.select().from(bookingsTable);
  const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalFare), 0);

  // Daily revenue for last 14 days
  const bookingsByDay: Record<string, { revenue: number; bookings: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    bookingsByDay[key] = { revenue: 0, bookings: 0 };
  }
  bookings.forEach(b => {
    const key = b.createdAt.toISOString().slice(0, 10);
    if (bookingsByDay[key]) {
      bookingsByDay[key].revenue += Number(b.totalFare);
      bookingsByDay[key].bookings++;
    }
  });

  // Revenue by route
  const routeRevenue: Record<string, { revenue: number; bookings: number }> = {};
  bookings.forEach(b => {
    const key = `${b.origin} → ${b.destination}`;
    if (!routeRevenue[key]) routeRevenue[key] = { revenue: 0, bookings: 0 };
    routeRevenue[key].revenue += Number(b.totalFare);
    routeRevenue[key].bookings++;
  });

  // Revenue by bus type (mock)
  const revenueByBusType = [
    { busType: "AC Deluxe", revenue: totalRevenue * 0.4, bookings: Math.ceil(bookings.length * 0.4) },
    { busType: "Ultra Deluxe", revenue: totalRevenue * 0.3, bookings: Math.ceil(bookings.length * 0.3) },
    { busType: "Non-AC Express", revenue: totalRevenue * 0.2, bookings: Math.ceil(bookings.length * 0.2) },
    { busType: "Sleeper", revenue: totalRevenue * 0.1, bookings: Math.ceil(bookings.length * 0.1) },
  ];

  res.json({
    totalRevenue,
    bookingsByDay: Object.entries(bookingsByDay).map(([date, v]) => ({ date, ...v })),
    revenueByRoute: Object.entries(routeRevenue).map(([route, v]) => ({ route, ...v })),
    revenueByBusType,
  });
});

router.get("/admin/complaints", async (_req, res) => {
  const rows = await db.select().from(complaintsTable);
  res.json(rows.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/admin/complaints", async (req, res) => {
  const parsed = CreateComplaintBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const data = parsed.data;

  const priority = data.category === "safety" ? "high" : data.category === "delay" ? "medium" : "low";
  const [complaint] = await db.insert(complaintsTable).values({
    passengerId: data.passengerId,
    busNumber: data.busNumber,
    category: data.category,
    description: data.description,
    status: "open",
    priority,
  }).returning();

  res.status(201).json({ ...complaint, createdAt: complaint.createdAt.toISOString() });
});

export default router;
