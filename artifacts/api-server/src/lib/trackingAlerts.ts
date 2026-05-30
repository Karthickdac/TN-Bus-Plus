import { cityCoord, type LatLng } from "./tnGeo";

export type TrackStop = { name: string; lat: number; lng: number; passed: boolean };
export type RouteGeometry = {
  origin: string;
  destination: string;
  polyline: LatLng[];
  stops: TrackStop[];
};
export type TrackAlert = {
  type: "overspeed" | "deviation" | "geofence" | "breakdown" | "stale_signal";
  severity: "info" | "warning" | "critical";
  message: string;
};

const EARTH_RADIUS_KM = 6371;
const OVERSPEED_KMH = 80; // govt bus ceiling
const DEVIATION_KM = 6; // max distance from route corridor before flagging
const GEOFENCE_KM = 2; // proximity to a stop counts as "arriving"
const STALE_SIGNAL_MIN = 3; // no update beyond this = stale GPS

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Distance from point p to the line segment a-b, in km. Uses an equirectangular
// projection around the segment which is accurate enough at city scale.
function pointToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const latRef = toRad((a.lat + b.lat) / 2);
  const project = (q: LatLng) => ({
    x: toRad(q.lng) * Math.cos(latRef) * EARTH_RADIUS_KM,
    y: toRad(q.lat) * EARTH_RADIUS_KM,
  });
  const pp = project(p);
  const pa = project(a);
  const pb = project(b);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((pp.x - pa.x) * dx + (pp.y - pa.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = pa.x + t * dx;
  const cy = pa.y + t * dy;
  return Math.hypot(pp.x - cx, pp.y - cy);
}

export function distanceToRouteKm(p: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineKm(p, polyline[0]);
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentKm(p, polyline[i], polyline[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

// Build ordered geometry (origin → stops → destination) from city names,
// skipping any city we don't have coordinates for. `pos` marks stops already
// passed (closest point on the bus's traveled portion).
export function buildRouteGeometry(
  origin: string,
  destination: string,
  stops: string[],
  pos: LatLng | null,
): RouteGeometry {
  const seq = [origin, ...stops, destination];
  const polyline: LatLng[] = [];
  const stopNodes: TrackStop[] = [];

  for (const name of seq) {
    const c = cityCoord(name);
    if (!c) continue;
    polyline.push(c);
  }

  // Mark stops passed: a stop is "passed" when the bus is closer to the
  // destination than to that stop along the corridor (simple progress heuristic).
  const destCoord = cityCoord(destination);
  const distBusToDest = pos && destCoord ? haversineKm(pos, destCoord) : null;
  for (const name of [origin, ...stops, destination]) {
    const c = cityCoord(name);
    if (!c) continue;
    let passed = false;
    if (pos && destCoord && distBusToDest !== null) {
      const stopToDest = haversineKm(c, destCoord);
      passed = stopToDest > distBusToDest + 1; // 1km tolerance
    }
    stopNodes.push({ name, lat: c.lat, lng: c.lng, passed });
  }

  return { origin, destination, polyline, stops: stopNodes };
}

export function computeAlerts(input: {
  pos: LatLng;
  speed: number;
  status: string;
  lastUpdated: Date;
  geometry: RouteGeometry;
  now?: Date;
}): TrackAlert[] {
  const { pos, speed, status, lastUpdated, geometry } = input;
  const now = input.now ?? new Date();
  const alerts: TrackAlert[] = [];

  if (status === "breakdown") {
    alerts.push({
      type: "breakdown",
      severity: "critical",
      message: "Vehicle reported a breakdown. Operations team alerted.",
    });
  }

  const ageMin = (now.getTime() - lastUpdated.getTime()) / 60000;
  if (ageMin > STALE_SIGNAL_MIN) {
    alerts.push({
      type: "stale_signal",
      severity: "warning",
      message: `No GPS signal for ${Math.round(ageMin)} min — last known position shown.`,
    });
  }

  if (speed > OVERSPEED_KMH) {
    alerts.push({
      type: "overspeed",
      severity: "warning",
      message: `Over speed limit: ${Math.round(speed)} km/h (limit ${OVERSPEED_KMH} km/h).`,
    });
  }

  if (geometry.polyline.length >= 1) {
    const dev = distanceToRouteKm(pos, geometry.polyline);
    if (dev > DEVIATION_KM) {
      alerts.push({
        type: "deviation",
        severity: "critical",
        message: `Off route by ${dev.toFixed(1)} km from the planned corridor.`,
      });
    }
  }

  // Geofence: approaching the nearest not-yet-passed stop.
  let nearest: { name: string; km: number } | null = null;
  for (const s of geometry.stops) {
    if (s.passed) continue;
    const km = haversineKm(pos, { lat: s.lat, lng: s.lng });
    if (!nearest || km < nearest.km) nearest = { name: s.name, km };
  }
  if (nearest && nearest.km <= GEOFENCE_KM) {
    alerts.push({
      type: "geofence",
      severity: "info",
      message: `Approaching ${nearest.name} (${(nearest.km * 1000).toFixed(0)} m).`,
    });
  }

  return alerts;
}
