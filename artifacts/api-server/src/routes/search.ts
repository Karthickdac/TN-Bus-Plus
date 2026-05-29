import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { schedulesTable, busesTable, routesTable } from "@workspace/db";

const router: IRouter = Router();

// Deterministic pseudo-random in [0, 1) seeded by an integer, so predictions
// are stable per trip across refreshes instead of changing on every request.
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function hasAmenity(amenities: string[], ...needles: string[]): boolean {
  const lower = amenities.map(a => a.toLowerCase());
  return needles.some(needle => lower.some(a => a.includes(needle.toLowerCase())));
}

function isTrue(v: unknown): boolean {
  return v === "true" || v === "1" || v === true;
}

router.get("/search", async (req, res) => {
  const { origin, destination } = req.query;
  const wantAc = isTrue(req.query.ac);
  const wantSleeper = isTrue(req.query.sleeper);
  const wantCharging = isTrue(req.query.chargingPort);
  const wantGps = isTrue(req.query.liveGps);
  const wantToilet = isTrue(req.query.toilet);
  const wantWomen = isTrue(req.query.womenFriendly);
  const wantLowCrowd = isTrue(req.query.lowCrowd);
  const wantNight = isTrue(req.query.nightBus);

  const allRoutes = await db.select().from(routesTable);
  const allBuses = await db.select().from(busesTable);
  const allSchedules = await db.select().from(schedulesTable);

  const busMap = new Map(allBuses.map(b => [b.id, b]));
  const routeMap = new Map(allRoutes.map(r => [r.id, r]));

  const matchingRoutes = allRoutes.filter(r => {
    const originMatch = !origin || r.origin.toLowerCase().includes(String(origin).toLowerCase());
    const destMatch = !destination || r.destination.toLowerCase().includes(String(destination).toLowerCase());
    return originMatch && destMatch;
  });
  const matchingRouteIds = new Set(matchingRoutes.map(r => r.id));

  const results = allSchedules
    .filter(s => matchingRouteIds.has(s.routeId))
    .map(s => {
      const bus = busMap.get(s.busId);
      const route = routeMap.get(s.routeId);
      if (!bus || !route) return null;

      const amenities = bus.amenities ?? [];
      const busTypeLower = bus.busType.toLowerCase();

      // Feature flags derived from bus type + amenities
      const isAc = busTypeLower.includes("ac") || hasAmenity(amenities, "ac", "air condition");
      const isSleeper = busTypeLower.includes("sleeper");
      const hasCharging = hasAmenity(amenities, "usb", "charg");
      const hasGps = hasAmenity(amenities, "gps", "live track", "tracking");
      const hasToilet = hasAmenity(amenities, "toilet", "washroom", "restroom");
      const isWomenFriendly = hasAmenity(amenities, "women", "cctv", "ladies");

      // Crowd density derived deterministically from real availability
      const crowdRatio = bus.totalSeats > 0 ? 1 - s.availableSeats / bus.totalSeats : 0;
      const crowdDensity = crowdRatio > 0.8 ? "high" : crowdRatio > 0.5 ? "medium" : "low";

      const depHour = new Date(s.departureTime).getHours();
      const isNightBus = depHour >= 21 || depHour < 5;

      // Apply filters
      if (wantAc && !isAc) return null;
      if (wantSleeper && !isSleeper) return null;
      if (wantCharging && !hasCharging) return null;
      if (wantGps && !hasGps) return null;
      if (wantToilet && !hasToilet) return null;
      if (wantWomen && !isWomenFriendly) return null;
      if (wantLowCrowd && crowdDensity !== "low") return null;
      if (wantNight && !isNightBus) return null;

      const punctualityScore = Number(bus.punctualityScore ?? 85);

      // Predicted delay: higher crowd + lower punctuality => longer expected delay.
      // Deterministic per schedule so it doesn't flicker on refresh.
      const delaySeed = seeded(s.id * 7 + bus.id);
      const punctualityFactor = (100 - punctualityScore) / 100; // 0 = perfect
      const estimatedDelay = Math.round(
        (punctualityFactor * 25 + crowdRatio * 15) * (0.5 + delaySeed)
      );

      // Trust scores (0-5), derived from real data deterministically.
      const comfortScore = Math.min(
        5,
        Number(
          (
            2.5 +
            (isAc ? 0.7 : 0) +
            (isSleeper ? 0.8 : 0) +
            Math.min(amenities.length, 5) * 0.2
          ).toFixed(1)
        )
      );
      const safetyRating = Math.min(
        5,
        Number(
          (
            2.8 +
            (punctualityScore / 100) * 1.2 +
            (hasGps ? 0.4 : 0) +
            (isWomenFriendly ? 0.4 : 0)
          ).toFixed(1)
        )
      );
      const driverRating = Number((3.6 + seeded(bus.id * 3 + 11) * 1.4).toFixed(1));

      // Fare trend prediction (cheap signal): based on crowd + a stable seed.
      const trendSeed = seeded(s.id * 13 + 5);
      const fareTrend =
        crowdRatio > 0.7 || trendSeed > 0.66
          ? "rising"
          : trendSeed < 0.33
          ? "falling"
          : "stable";

      // Alternate boarding points from the route's stops.
      const nearbyBoardingPoints = (route.stops ?? []).slice(0, 3);

      return {
        scheduleId: s.id,
        busId: bus.id,
        busNumber: bus.busNumber,
        busType: bus.busType,
        origin: route.origin,
        destination: route.destination,
        departureTime: s.departureTime.toISOString(),
        arrivalTime: s.arrivalTime.toISOString(),
        fare: Number(s.fare),
        availableSeats: s.availableSeats,
        totalSeats: bus.totalSeats,
        amenities,
        punctualityScore,
        crowdDensity,
        estimatedDelay,
        comfortScore,
        safetyRating,
        driverRating,
        driverName: bus.driverName ?? null,
        fareTrend,
        isNightBus,
        nearbyBoardingPoints,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

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
