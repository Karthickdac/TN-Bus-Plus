import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { schedulesTable, routesTable } from "@workspace/db";
import { searchTrips } from "../lib/searchTrips";

const router: IRouter = Router();

// Deterministic pseudo-random in [0, 1) seeded by an integer, so predictions
// are stable per trip across refreshes instead of changing on every request.
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function isTrue(v: unknown): boolean {
  return v === "true" || v === "1" || v === true;
}

router.get("/search", async (req, res) => {
  const { origin, destination } = req.query;

  const results = await searchTrips({
    origin: origin !== undefined ? String(origin) : undefined,
    destination: destination !== undefined ? String(destination) : undefined,
    ac: isTrue(req.query.ac),
    sleeper: isTrue(req.query.sleeper),
    chargingPort: isTrue(req.query.chargingPort),
    liveGps: isTrue(req.query.liveGps),
    toilet: isTrue(req.query.toilet),
    womenFriendly: isTrue(req.query.womenFriendly),
    lowCrowd: isTrue(req.query.lowCrowd),
    nightBus: isTrue(req.query.nightBus),
  });

  res.json(results);
});

// Fare across a range of upcoming dates so travellers can pick the cheapest day.
router.get("/search/fare-calendar", async (req, res) => {
  const { origin, destination } = req.query;
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? "14"), 10) || 14, 1), 30);

  const allRoutes = await db.select().from(routesTable);
  const allSchedules = await db.select().from(schedulesTable);

  const matchingRoutes = allRoutes.filter(r => {
    const originMatch = !origin || r.origin.toLowerCase().includes(String(origin).toLowerCase());
    const destMatch = !destination || r.destination.toLowerCase().includes(String(destination).toLowerCase());
    return originMatch && destMatch;
  });
  const matchingRouteIds = new Set(matchingRoutes.map(r => r.id));
  const relevantSchedules = allSchedules.filter(s => matchingRouteIds.has(s.routeId));

  // Base fare = the lowest scheduled fare on the route (fallback to route basefare).
  let baseFare = Math.min(...relevantSchedules.map(s => Number(s.fare)));
  if (!isFinite(baseFare)) {
    baseFare = matchingRoutes.length ? Number(matchingRoutes[0].basefare) : 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendar = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    // Weekends and the upcoming weekend trend pricier; deterministic per-day jitter.
    const weekendBump = dow === 0 || dow === 5 || dow === 6 ? 1.15 : 1;
    const jitter = 0.9 + seeded(d.getTime() / 86400000) * 0.25;
    const fare = Math.round(baseFare * weekendBump * jitter);
    return {
      date: d.toISOString().slice(0, 10),
      fare,
      isCheapest: false,
      available: relevantSchedules.length > 0,
    };
  });

  if (calendar.length) {
    const min = Math.min(...calendar.map(c => c.fare));
    for (const c of calendar) c.isCheapest = c.fare === min;
  }

  res.json(calendar);
});

export default router;
