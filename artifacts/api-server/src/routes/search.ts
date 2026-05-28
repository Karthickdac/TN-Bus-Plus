import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { schedulesTable, busesTable, routesTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";

const router: IRouter = Router();

router.get("/search", async (req, res) => {
  const { origin, destination, ac, sleeper } = req.query;

  const allRoutes = await db.select().from(routesTable);
  const allBuses = await db.select().from(busesTable);
  const allSchedules = await db.select().from(schedulesTable);

  const busMap = new Map(allBuses.map(b => [b.id, b]));
  const routeMap = new Map(allRoutes.map(r => [r.id, r]));

  let matchingRoutes = allRoutes.filter(r => {
    const originMatch = !origin || r.origin.toLowerCase().includes(String(origin).toLowerCase());
    const destMatch = !destination || r.destination.toLowerCase().includes(String(destination).toLowerCase());
    return originMatch && destMatch;
  });

  const matchingRouteIds = new Set(matchingRoutes.map(r => r.id));

  let results = allSchedules
    .filter(s => matchingRouteIds.has(s.routeId))
    .map(s => {
      const bus = busMap.get(s.busId);
      const route = routeMap.get(s.routeId);
      if (!bus || !route) return null;

      const amenities = bus.amenities ?? [];
      if (ac === "true" && !bus.busType.includes("AC") && !amenities.includes("AC")) return null;
      if (sleeper === "true" && !bus.busType.includes("Sleeper")) return null;

      const crowdRatio = 1 - (s.availableSeats / bus.totalSeats);
      const crowdDensity = crowdRatio > 0.8 ? "high" : crowdRatio > 0.5 ? "medium" : "low";
      const delayChance = Math.random();
      const estimatedDelay = delayChance > 0.7 ? Math.floor(Math.random() * 30) : 0;

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
        punctualityScore: Number(bus.punctualityScore ?? 85),
        crowdDensity,
        estimatedDelay,
      };
    })
    .filter(Boolean);

  res.json(results);
});

export default router;
