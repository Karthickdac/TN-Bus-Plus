import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  busesTable,
  routesTable,
  complaintsTable,
  busLocationsTable,
  depotsTable,
} from "@workspace/db";
import { computeOpsAnalytics, type OpsBus } from "../lib/opsAnalytics";
import { generateInsights } from "../lib/aiInsights";

const router: IRouter = Router();

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Depot-wise complaint heatmap, daily trends and sentiment breakdown. Complaints
// link to a depot via their bus number → bus.depotId → depot.
router.get("/admin/complaint-intel", async (_req, res) => {
  const [complaints, buses, depots] = await Promise.all([
    db.select().from(complaintsTable),
    db.select().from(busesTable),
    db.select().from(depotsTable),
  ]);

  const busByNumber = new Map(buses.map(b => [b.busNumber, b]));
  const depotById = new Map(depots.map(d => [d.id, d]));

  const categories = Array.from(new Set(complaints.map(c => c.aiCategory ?? c.category))).sort();

  interface DepotBucket {
    depotId: number | null;
    depotName: string;
    total: number;
    escalated: number;
    negative: number;
    byCategory: Record<string, number>;
  }
  const depotBuckets = new Map<string, DepotBucket>();
  const bucketFor = (depotId: number | null, depotName: string): DepotBucket => {
    const key = depotId === null ? "none" : String(depotId);
    let b = depotBuckets.get(key);
    if (!b) {
      b = { depotId, depotName, total: 0, escalated: 0, negative: 0, byCategory: {} };
      depotBuckets.set(key, b);
    }
    return b;
  };

  for (const c of complaints) {
    const bus = c.busNumber ? busByNumber.get(c.busNumber) : undefined;
    const depot = bus?.depotId != null ? depotById.get(bus.depotId) : undefined;
    const bucket = bucketFor(depot?.id ?? null, depot?.name ?? "Unassigned");
    bucket.total++;
    if (c.escalated) bucket.escalated++;
    if (c.sentiment === "negative") bucket.negative++;
    const cat = c.aiCategory ?? c.category;
    bucket.byCategory[cat] = (bucket.byCategory[cat] ?? 0) + 1;
  }

  // Daily trends for the last 14 days.
  const trendsByDay: Record<string, { total: number; negative: number; escalated: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendsByDay[d.toISOString().slice(0, 10)] = { total: 0, negative: 0, escalated: 0 };
  }
  for (const c of complaints) {
    const key = c.createdAt.toISOString().slice(0, 10);
    const t = trendsByDay[key];
    if (t) {
      t.total++;
      if (c.sentiment === "negative") t.negative++;
      if (c.escalated) t.escalated++;
    }
  }

  const sentimentBreakdown = {
    positive: complaints.filter(c => c.sentiment === "positive").length,
    neutral: complaints.filter(c => c.sentiment === "neutral").length,
    negative: complaints.filter(c => c.sentiment === "negative").length,
    unanalyzed: complaints.filter(c => c.aiAnalyzedAt === null).length,
  };

  res.json({
    categories,
    depots: Array.from(depotBuckets.values()).sort((a, b) => b.total - a.total),
    trends: Object.entries(trendsByDay).map(([date, v]) => ({ date, ...v })),
    sentimentBreakdown,
  });
});

// Plain-language AI insights derived from current operational metrics.
router.get("/admin/ai-insights", async (_req, res) => {
  const [buses, bookings, complaints, locations] = await Promise.all([
    db.select().from(busesTable),
    db.select().from(bookingsTable),
    db.select().from(complaintsTable),
    db.select().from(busLocationsTable),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBookings = bookings.filter(b => b.createdAt >= today);
  const revenueToday = todayBookings.reduce((s, b) => s + Number(b.totalFare), 0);
  const activeBuses = buses.filter(b => b.status === "active");
  const openComplaints = complaints.filter(c => c.status === "open");

  const onTimePercentage = activeBuses.length
    ? Number(
        (activeBuses.reduce((s, b) => s + Number(b.punctualityScore ?? 0), 0) / activeBuses.length).toFixed(1),
      )
    : 0;

  // Most common open-complaint category.
  const catCounts: Record<string, number> = {};
  for (const c of openComplaints) {
    const cat = c.aiCategory ?? c.category;
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
  }
  const topComplaintCategory =
    Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Busiest corridor and peak booking hour across all bookings.
  const routeCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  for (const b of bookings) {
    const key = `${b.origin} → ${b.destination}`;
    routeCounts[key] = (routeCounts[key] ?? 0) + 1;
    const h = b.createdAt.getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const topRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const peakHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? Number(peakHourEntry[0]) : null;

  const breakdowns = locations.filter(l => l.status === "breakdown").length;

  const opsBuses: OpsBus[] = buses.map(b => ({
    id: b.id,
    busNumber: b.busNumber,
    busType: b.busType,
    status: b.status,
    driverName: b.driverName,
    punctualityScore: Number(b.punctualityScore ?? 85),
  }));
  const ops = computeOpsAnalytics(opsBuses);

  const { insights, source } = await generateInsights({
    totalBuses: buses.length,
    activeBuses: activeBuses.length,
    onTimePercentage,
    revenueToday,
    bookingsToday: todayBookings.length,
    openComplaints: openComplaints.length,
    escalatedComplaints: openComplaints.filter(c => c.escalated).length,
    negativeComplaints: openComplaints.filter(c => c.sentiment === "negative").length,
    topComplaintCategory,
    fleetAlerts: 0,
    breakdowns,
    highMaintenanceRisk: ops.maintenanceSummary.highRisk,
    flaggedDrivers: ops.driverSummary.flagged,
    topRoute,
    peakHour,
  });

  res.json({ generatedAt: new Date().toISOString(), source, insights });
});

// Passenger demand heatmaps: by origin, destination, route corridor, hour, day.
router.get("/admin/passenger-demand", async (_req, res) => {
  const bookings = await db.select().from(bookingsTable);

  const tally = (key: (b: typeof bookingsTable.$inferSelect) => string) => {
    const m: Record<string, { bookings: number; revenue: number }> = {};
    for (const b of bookings) {
      const k = key(b);
      if (!m[k]) m[k] = { bookings: 0, revenue: 0 };
      m[k].bookings++;
      m[k].revenue += Number(b.totalFare);
    }
    return Object.entries(m)
      .map(([label, v]) => ({ label, bookings: v.bookings, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.bookings - a.bookings);
  };

  const byHourMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) byHourMap[h] = 0;
  const byDayMap: Record<string, number> = {};
  for (const d of DAY_NAMES) byDayMap[d] = 0;
  for (const b of bookings) {
    byHourMap[b.createdAt.getHours()]++;
    byDayMap[DAY_NAMES[b.createdAt.getDay()]]++;
  }

  res.json({
    byOrigin: tally(b => b.origin),
    byDestination: tally(b => b.destination),
    byRoute: tally(b => `${b.origin} → ${b.destination}`),
    byHour: Object.entries(byHourMap).map(([hour, bookings]) => ({ hour: Number(hour), bookings })),
    byDay: DAY_NAMES.map(day => ({ day, bookings: byDayMap[day] })),
  });
});

// Predictive maintenance, driver behaviour and fuel/emissions analytics.
router.get("/admin/ops-analytics", async (_req, res) => {
  const buses = await db.select().from(busesTable);
  const opsBuses: OpsBus[] = buses.map(b => ({
    id: b.id,
    busNumber: b.busNumber,
    busType: b.busType,
    status: b.status,
    driverName: b.driverName,
    punctualityScore: Number(b.punctualityScore ?? 85),
  }));
  res.json(computeOpsAnalytics(opsBuses));
});

export default router;
