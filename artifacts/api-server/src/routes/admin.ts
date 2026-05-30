import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, busesTable, routesTable, passengersTable, complaintsTable, busLocationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateComplaintBody, CreateRouteBody, UpdateRouteBody } from "@workspace/api-zod";
import { buildRouteGeometry, computeAlerts, type TrackAlert } from "../lib/trackingAlerts";
import { cityCoord } from "../lib/tnGeo";

// Routes drive the live map polyline/stops, which only render for places we have
// coordinates for. Reject any place name we can't resolve so a saved route never
// produces an empty or partial track.
function unresolvedPlaces(origin: string, destination: string, stops: string[]): string[] {
  return [origin, destination, ...stops].filter(name => name.trim() && !cityCoord(name));
}

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

  // On-time rate is the mean punctuality of the fleet (active buses preferred),
  // derived from real per-bus punctuality scores rather than a fixed constant.
  const activeBuses = buses.filter(b => b.status === "active");
  const punctualityPool = activeBuses.length ? activeBuses : buses;
  const onTimePercentage = punctualityPool.length
    ? Number(
        (
          punctualityPool.reduce((sum, b) => sum + Number(b.punctualityScore ?? 0), 0) /
          punctualityPool.length
        ).toFixed(1)
      )
    : 0;

  res.json({
    totalBuses: buses.length,
    activeBuses: activeBuses.length,
    totalBookingsToday: todayBookings.length,
    revenueToday,
    totalPassengers: passengers.length,
    activeRoutes: routes.length,
    pendingComplaints: complaints.filter(c => c.status === "open").length,
    onTimePercentage,
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
  const buses = await db.select().from(busesTable);
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

  // Revenue by bus type — aggregated from the actual bus type of each booking
  // (resolved via the booking's bus number), not fixed ratios of the total.
  const busTypeByNumber = new Map(buses.map(b => [b.busNumber, b.busType]));
  const busTypeTotals: Record<string, { revenue: number; bookings: number }> = {};
  bookings.forEach(b => {
    const busType = busTypeByNumber.get(b.busNumber) ?? "Unknown";
    if (!busTypeTotals[busType]) busTypeTotals[busType] = { revenue: 0, bookings: 0 };
    busTypeTotals[busType].revenue += Number(b.totalFare);
    busTypeTotals[busType].bookings++;
  });
  const revenueByBusType = Object.entries(busTypeTotals)
    .map(([busType, v]) => ({ busType, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

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

// Live fleet GPS monitoring — all buses with locations, plus derived alerts.
router.get("/admin/bus-locations", async (_req, res) => {
  const [locations, buses, routes] = await Promise.all([
    db.select().from(busLocationsTable),
    db.select().from(busesTable),
    db.select().from(routesTable),
  ]);
  const busById = new Map(buses.map(b => [b.id, b]));
  const routeById = new Map(routes.map(r => [r.id, r]));
  const now = new Date();

  let online = 0;
  let alertsTotal = 0;
  let breakdowns = 0;

  const fleet = locations.map(loc => {
    const pos = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
    const speed = Number(loc.speed);
    const bus = busById.get(loc.busId);
    const route = bus?.routeId ? routeById.get(bus.routeId) : undefined;
    const geometry = route
      ? buildRouteGeometry(route.origin, route.destination, route.stops ?? [], pos)
      : { origin: "", destination: "", polyline: [], stops: [] };

    const alerts: TrackAlert[] = computeAlerts({
      pos,
      speed,
      status: loc.status,
      lastUpdated: loc.lastUpdated,
      geometry,
      now,
    });

    const ageMin = (now.getTime() - loc.lastUpdated.getTime()) / 60000;
    const isOnline = ageMin <= 3;
    if (isOnline) online++;
    if (loc.status === "breakdown") breakdowns++;
    alertsTotal += alerts.length;

    const severityRank = { critical: 3, warning: 2, info: 1 } as const;
    const topAlertSeverity = alerts.length
      ? alerts.reduce((top, a) =>
          severityRank[a.severity] > severityRank[top.severity] ? a : top,
        ).severity
      : null;

    return {
      busId: loc.busId,
      busNumber: loc.busNumber,
      busType: bus?.busType ?? "Unknown",
      driverName: bus?.driverName ?? null,
      latitude: pos.lat,
      longitude: pos.lng,
      speed,
      heading: Number(loc.heading),
      status: loc.status,
      nextStop: loc.nextStop,
      etaMinutes: loc.etaMinutes,
      lastUpdated: loc.lastUpdated.toISOString(),
      online: isOnline,
      alertCount: alerts.length,
      topAlertSeverity,
      alerts,
    };
  });

  res.json({
    buses: fleet,
    summary: {
      total: fleet.length,
      online,
      offline: fleet.length - online,
      alerts: alertsTotal,
      breakdowns,
    },
  });
});

function serializeRoute(r: typeof routesTable.$inferSelect) {
  return {
    ...r,
    distanceKm: Number(r.distanceKm),
    basefare: Number(r.basefare),
    stops: r.stops ?? [],
  };
}

router.get("/admin/routes", async (_req, res) => {
  const rows = await db.select().from(routesTable);
  res.json(rows.map(serializeRoute));
});

router.post("/admin/routes", async (req, res) => {
  const parsed = CreateRouteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const unknown = unresolvedPlaces(d.origin, d.destination, d.stops ?? []);
  if (unknown.length > 0)
    return res.status(400).json({ error: `Unknown place(s): ${unknown.join(", ")}` });
  const [route] = await db
    .insert(routesTable)
    .values({
      origin: d.origin,
      destination: d.destination,
      distanceKm: String(d.distanceKm),
      durationMinutes: d.durationMinutes,
      basefare: String(d.basefare),
      stops: d.stops ?? [],
    })
    .returning();
  res.status(201).json(serializeRoute(route));
});

router.patch("/admin/routes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateRouteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const unknown = unresolvedPlaces(d.origin, d.destination, d.stops ?? []);
  if (unknown.length > 0)
    return res.status(400).json({ error: `Unknown place(s): ${unknown.join(", ")}` });
  const [route] = await db
    .update(routesTable)
    .set({
      origin: d.origin,
      destination: d.destination,
      distanceKm: String(d.distanceKm),
      durationMinutes: d.durationMinutes,
      basefare: String(d.basefare),
      stops: d.stops ?? [],
    })
    .where(eq(routesTable.id, id))
    .returning();
  if (!route) return res.status(404).json({ error: "Route not found" });
  res.json(serializeRoute(route));
});

router.delete("/admin/routes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [route] = await db.delete(routesTable).where(eq(routesTable.id, id)).returning();
  if (!route) return res.status(404).json({ error: "Route not found" });
  res.status(204).end();
});

export default router;
