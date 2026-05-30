import { db } from "@workspace/db";
import { busLocationsTable, busesTable, routesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { cityCoord, type LatLng } from "./tnGeo";
import { haversineKm } from "./trackingAlerts";
import { logger } from "./logger";

// Demo fleet simulator. The product has no real GPS hardware feed (out of
// scope), so this advances each active bus along its route polyline and
// refreshes lastUpdated on a fixed tick. This makes the passenger tracker and
// admin fleet view genuinely live and exercises the derived safety alerts.

const TICK_MS = 4000;
const SPEED_FACTOR = 22; // accelerate travel so motion is visible in a demo
const AT_STOP_KM = 1.2;
// Rotating "lost signal" episode: one bus at a time stops transmitting for a
// stretch, then recovers. This keeps the stale-signal alert and the admin
// offline detection genuinely reachable instead of being dead code paths.
const DROPOUT_PERIOD_MS = 8 * 60_000; // a new bus drops every 8 min
const DROPOUT_DURATION_MS = 4 * 60_000; // and stays dark for 4 min

type Node = { name: string; lat: number; lng: number };
type BusSim = { progressKm: number };

const state = new Map<number, BusSim>();

function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function nodesFor(origin: string, destination: string, stops: string[]): Node[] {
  const out: Node[] = [];
  for (const name of [origin, ...stops, destination]) {
    const c = cityCoord(name);
    if (c) out.push({ name, lat: c.lat, lng: c.lng });
  }
  return out;
}

function segLengths(nodes: Node[]): number[] {
  const segs: number[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    segs.push(haversineKm(nodes[i], nodes[i + 1]));
  }
  return segs;
}

function nearestProgress(nodes: Node[], segs: number[], pos: LatLng): number {
  // Find cumulative distance of the node nearest the current position.
  let best = 0;
  let bestKm = Infinity;
  let cum = 0;
  for (let i = 0; i < nodes.length; i++) {
    const d = haversineKm(pos, nodes[i]);
    if (d < bestKm) {
      bestKm = d;
      best = cum;
    }
    if (i < segs.length) cum += segs[i];
  }
  return best;
}

function interpolate(
  nodes: Node[],
  segs: number[],
  total: number,
  progressKm: number,
): { pos: LatLng; heading: number; nextNodeIndex: number; distToNext: number } {
  const d = Math.max(0, Math.min(progressKm, total));
  let cum = 0;
  for (let i = 0; i < segs.length; i++) {
    if (d <= cum + segs[i] || i === segs.length - 1) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const t = segs[i] === 0 ? 0 : (d - cum) / segs[i];
      const pos = {
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      };
      const distToNext = segs[i] * (1 - t);
      return { pos, heading: bearing(a, b), nextNodeIndex: i + 1, distToNext };
    }
    cum += segs[i];
  }
  const last = nodes[nodes.length - 1];
  return { pos: { lat: last.lat, lng: last.lng }, heading: 0, nextNodeIndex: nodes.length - 1, distToNext: 0 };
}

async function tick() {
  try {
    const [locations, buses, routes] = await Promise.all([
      db.select().from(busLocationsTable),
      db.select().from(busesTable),
      db.select().from(routesTable),
    ]);
    const busById = new Map(buses.map(b => [b.id, b]));
    const routeById = new Map(routes.map(r => [r.id, r]));

    // Determine which bus (if any) is currently in a signal-dropout episode.
    const now = Date.now();
    const sortedBusIds = locations.map(l => l.busId).sort((a, b) => a - b);
    const inDropoutWindow = now % DROPOUT_PERIOD_MS < DROPOUT_DURATION_MS;
    const droppedBusId =
      inDropoutWindow && sortedBusIds.length > 0
        ? sortedBusIds[Math.floor(now / DROPOUT_PERIOD_MS) % sortedBusIds.length]
        : -1;

    for (const loc of locations) {
      // Skip the dropped bus entirely so its lastUpdated ages and the
      // stale-signal / offline detection fires, then recovers next window.
      if (loc.busId === droppedBusId) continue;

      if (loc.status === "breakdown") {
        // Keep a broken-down bus stationary but mark it as a live signal.
        await db
          .update(busLocationsTable)
          .set({ speed: "0", lastUpdated: new Date() })
          .where(eq(busLocationsTable.id, loc.id));
        continue;
      }

      const bus = busById.get(loc.busId);
      const route = bus?.routeId ? routeById.get(bus.routeId) : undefined;
      if (!route) {
        await db
          .update(busLocationsTable)
          .set({ lastUpdated: new Date() })
          .where(eq(busLocationsTable.id, loc.id));
        continue;
      }

      const nodes = nodesFor(route.origin, route.destination, route.stops ?? []);
      if (nodes.length < 2) {
        await db
          .update(busLocationsTable)
          .set({ lastUpdated: new Date() })
          .where(eq(busLocationsTable.id, loc.id));
        continue;
      }
      const segs = segLengths(nodes);
      const total = segs.reduce((s, v) => s + v, 0);

      let sim = state.get(loc.busId);
      if (!sim) {
        sim = { progressKm: nearestProgress(nodes, segs, { lat: Number(loc.latitude), lng: Number(loc.longitude) }) };
        state.set(loc.busId, sim);
      }

      // Speed random-walks within a realistic band; occasionally tops the limit
      // so the overspeed alert fires naturally.
      let speed = Number(loc.speed) || 55;
      speed += (Math.random() - 0.5) * 12;
      speed = Math.max(25, Math.min(92, speed));

      const advance = speed * (TICK_MS / 3_600_000) * SPEED_FACTOR;
      sim.progressKm += advance;
      if (sim.progressKm >= total) sim.progressKm = 0; // loop the trip

      const { pos, heading, nextNodeIndex, distToNext } = interpolate(nodes, segs, total, sim.progressKm);
      const nextNode = nodes[Math.min(nextNodeIndex, nodes.length - 1)];
      const atStop = distToNext <= AT_STOP_KM;
      const etaMinutes = speed > 1 ? Math.max(1, Math.round((distToNext / speed) * 60)) : null;

      await db
        .update(busLocationsTable)
        .set({
          latitude: pos.lat.toFixed(6),
          longitude: pos.lng.toFixed(6),
          speed: speed.toFixed(2),
          heading: heading.toFixed(2),
          nextStop: nextNode.name,
          etaMinutes,
          status: atStop ? "at-stop" : "on-route",
          lastUpdated: new Date(),
        })
        .where(eq(busLocationsTable.id, loc.id));
    }
  } catch (err) {
    logger.error({ err }, "fleet simulator tick failed");
  }
}

let started = false;
export function startFleetSimulator() {
  if (started) return;
  started = true;
  logger.info("Starting fleet GPS simulator");
  setInterval(() => {
    void tick();
  }, TICK_MS);
}
