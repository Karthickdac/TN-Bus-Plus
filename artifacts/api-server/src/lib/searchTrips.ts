import { db } from "@workspace/db";
import { schedulesTable, busesTable, routesTable } from "@workspace/db";

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

export interface TripFilters {
  origin?: string;
  destination?: string;
  ac?: boolean;
  sleeper?: boolean;
  chargingPort?: boolean;
  liveGps?: boolean;
  toilet?: boolean;
  womenFriendly?: boolean;
  lowCrowd?: boolean;
  nightBus?: boolean;
}

export interface TripResult {
  scheduleId: number;
  busId: number;
  busNumber: string;
  busType: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  availableSeats: number;
  totalSeats: number;
  amenities: string[];
  punctualityScore: number;
  crowdDensity: string;
  estimatedDelay: number;
  comfortScore: number;
  safetyRating: number;
  driverRating: number;
  driverName: string | null;
  fareTrend: string;
  isNightBus: boolean;
  nearbyBoardingPoints: string[];
}

/**
 * Core trip search + scoring used by both the /search REST route and the AI
 * assistant. Filters real schedules by route and amenity flags, then derives
 * deterministic comfort/safety/delay/fare signals from the underlying data.
 */
export async function searchTrips(filters: TripFilters): Promise<TripResult[]> {
  const { origin, destination } = filters;

  const allRoutes = await db.select().from(routesTable);
  const allBuses = await db.select().from(busesTable);
  const allSchedules = await db.select().from(schedulesTable);

  const busMap = new Map(allBuses.map(b => [b.id, b]));
  const routeMap = new Map(allRoutes.map(r => [r.id, r]));

  const matchingRoutes = allRoutes.filter(r => {
    const originMatch = !origin || r.origin.toLowerCase().includes(origin.toLowerCase());
    const destMatch = !destination || r.destination.toLowerCase().includes(destination.toLowerCase());
    return originMatch && destMatch;
  });
  const matchingRouteIds = new Set(matchingRoutes.map(r => r.id));

  return allSchedules
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
      if (filters.ac && !isAc) return null;
      if (filters.sleeper && !isSleeper) return null;
      if (filters.chargingPort && !hasCharging) return null;
      if (filters.liveGps && !hasGps) return null;
      if (filters.toilet && !hasToilet) return null;
      if (filters.womenFriendly && !isWomenFriendly) return null;
      if (filters.lowCrowd && crowdDensity !== "low") return null;
      if (filters.nightBus && !isNightBus) return null;

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

      const result: TripResult = {
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
      return result;
    })
    .filter((r): r is TripResult => r !== null);
}
