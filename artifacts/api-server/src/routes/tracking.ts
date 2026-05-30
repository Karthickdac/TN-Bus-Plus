import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { busLocationsTable, busesTable, routesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildRouteGeometry, computeAlerts, haversineKm } from "../lib/trackingAlerts";
import { cityCoord } from "../lib/tnGeo";

const router: IRouter = Router();

router.get("/tracking/:busId", async (req, res) => {
  const busId = parseInt(req.params.busId);
  const [row] = await db.select().from(busLocationsTable).where(eq(busLocationsTable.busId, busId));
  if (!row) return res.status(404).json({ error: "Bus location not found" });

  const pos = { lat: Number(row.latitude), lng: Number(row.longitude) };
  const speed = Number(row.speed);

  // Resolve the bus's route to build geometry + alerts.
  const [bus] = await db.select().from(busesTable).where(eq(busesTable.id, busId));
  let route = null as ReturnType<typeof buildRouteGeometry> | null;
  if (bus?.routeId) {
    const [r] = await db.select().from(routesTable).where(eq(routesTable.id, bus.routeId));
    if (r) route = buildRouteGeometry(r.origin, r.destination, r.stops ?? [], pos);
  }

  const alerts = route
    ? computeAlerts({ pos, speed, status: row.status, lastUpdated: row.lastUpdated, geometry: route })
    : computeAlerts({
        pos,
        speed,
        status: row.status,
        lastUpdated: row.lastUpdated,
        geometry: { origin: "", destination: "", polyline: [], stops: [] },
      });

  // ETA to final destination from remaining straight-line distance and speed.
  let etaToDestinationMinutes: number | null = null;
  const destCoord = route ? cityCoord(route.destination) : null;
  if (destCoord && speed > 5) {
    const remainingKm = haversineKm(pos, destCoord);
    etaToDestinationMinutes = Math.max(1, Math.round((remainingKm / speed) * 60));
  }

  return res.json({
    busId: row.busId,
    busNumber: row.busNumber,
    latitude: pos.lat,
    longitude: pos.lng,
    speed,
    heading: Number(row.heading),
    nextStop: row.nextStop,
    etaMinutes: row.etaMinutes,
    etaToDestinationMinutes,
    status: row.status,
    lastUpdated: row.lastUpdated.toISOString(),
    route,
    alerts,
  });
});

export default router;
