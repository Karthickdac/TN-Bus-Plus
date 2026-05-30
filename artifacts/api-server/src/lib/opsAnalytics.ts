// Predictive operations analytics derived deterministically from stored fleet
// data (no real IoT/telematics feeds). Same bus always yields the same figures,
// so the admin views are stable across reloads.

export interface OpsBus {
  id: number;
  busNumber: string;
  busType: string;
  status: string;
  driverName: string | null;
  punctualityScore: number;
}

type Risk = "low" | "medium" | "high";

export interface MaintenanceRow {
  busId: number;
  busNumber: string;
  busType: string;
  status: string;
  odometerKm: number;
  kmSinceService: number;
  engineHealthScore: number;
  risk: Risk;
  predictedServiceInDays: number;
}

export interface DriverRow {
  busNumber: string;
  driverName: string;
  rating: number;
  safetyScore: number;
  harshBrakingPer100km: number;
  overspeedEvents: number;
  idlingPct: number;
  behaviour: string;
}

export interface FuelRow {
  busId: number;
  busNumber: string;
  busType: string;
  fuelEfficiencyKmpl: number;
  monthlyKm: number;
  monthlyFuelCostInr: number;
  co2KgPerMonth: number;
}

export interface OpsAnalytics {
  maintenance: MaintenanceRow[];
  maintenanceSummary: { highRisk: number; mediumRisk: number; lowRisk: number; dueWithin7Days: number };
  drivers: DriverRow[];
  driverSummary: { avgSafetyScore: number; flagged: number };
  fuel: FuelRow[];
  fuelSummary: { totalMonthlyFuelCostInr: number; avgEfficiencyKmpl: number; totalCo2KgPerMonth: number };
}

// Deterministic pseudo-random in [0,1) seeded by an integer.
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number, d = 0): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

const DIESEL_PRICE_INR = 92; // representative per-litre
const OPERATING_DAYS = 26;
const DAILY_KM = 340;
const SERVICE_INTERVAL_KM = 20000;

function baseEfficiency(busType: string): number {
  const t = busType.toLowerCase();
  if (t.includes("sleeper")) return 3.8;
  if (t.includes("ultra")) return 4.0;
  if (t.includes("ac")) return 4.2;
  return 5.1; // non-AC / ordinary
}

export function computeOpsAnalytics(buses: OpsBus[]): OpsAnalytics {
  const maintenance: MaintenanceRow[] = [];
  const drivers: DriverRow[] = [];
  const fuel: FuelRow[] = [];

  for (const b of buses) {
    const punctuality = Number.isFinite(b.punctualityScore) ? b.punctualityScore : 85;
    const odometerKm = round(45000 + seeded(b.id * 3 + 1) * 295000);
    const kmSinceService = round(seeded(b.id * 5 + 2) * 16000 + (100 - punctuality) * 130);
    const engineHealthScore = round(
      clamp(100 - kmSinceService / 320 - (100 - punctuality) * 0.45 - seeded(b.id * 7) * 6, 35, 99),
      1,
    );
    const forced = b.status === "maintenance" || b.status === "breakdown";
    const risk: Risk = forced || engineHealthScore < 55 ? "high" : engineHealthScore < 72 ? "medium" : "low";
    const kmToService = Math.max(0, SERVICE_INTERVAL_KM - kmSinceService);
    const predictedServiceInDays = forced ? 0 : Math.max(1, Math.round(kmToService / DAILY_KM));
    maintenance.push({
      busId: b.id, busNumber: b.busNumber, busType: b.busType, status: b.status,
      odometerKm, kmSinceService, engineHealthScore, risk, predictedServiceInDays,
    });

    const harshBrakingPer100km = round(1 + seeded(b.id * 11 + 3) * 7, 1);
    const overspeedEvents = Math.round(seeded(b.id * 13 + 4) * 12);
    const idlingPct = round(4 + seeded(b.id * 17 + 5) * 16, 1);
    const safetyScore = round(clamp(punctuality - harshBrakingPer100km * 1.6 - overspeedEvents * 0.6 + 8, 40, 99), 1);
    const rating = round(clamp(2.8 + safetyScore / 45, 1, 5), 1);
    const behaviour = safetyScore >= 85 ? "excellent" : safetyScore >= 72 ? "good" : safetyScore >= 60 ? "needs-coaching" : "high-risk";
    drivers.push({
      busNumber: b.busNumber, driverName: b.driverName ?? "Unassigned",
      rating, safetyScore, harshBrakingPer100km, overspeedEvents, idlingPct, behaviour,
    });

    const fuelEfficiencyKmpl = round(clamp(baseEfficiency(b.busType) * (0.9 + seeded(b.id * 19 + 6) * 0.25) - (idlingPct - 8) * 0.02, 2.5, 6.5), 2);
    const monthlyKm = round(DAILY_KM * OPERATING_DAYS * (0.85 + seeded(b.id * 23 + 7) * 0.3));
    const litres = monthlyKm / fuelEfficiencyKmpl;
    const monthlyFuelCostInr = round(litres * DIESEL_PRICE_INR);
    const co2KgPerMonth = round(litres * 2.68); // ~2.68 kg CO2 per litre diesel
    fuel.push({
      busId: b.id, busNumber: b.busNumber, busType: b.busType,
      fuelEfficiencyKmpl, monthlyKm, monthlyFuelCostInr, co2KgPerMonth,
    });
  }

  maintenance.sort((a, b) => a.predictedServiceInDays - b.predictedServiceInDays);
  drivers.sort((a, b) => a.safetyScore - b.safetyScore);
  fuel.sort((a, b) => b.monthlyFuelCostInr - a.monthlyFuelCostInr);

  const maintenanceSummary = {
    highRisk: maintenance.filter(m => m.risk === "high").length,
    mediumRisk: maintenance.filter(m => m.risk === "medium").length,
    lowRisk: maintenance.filter(m => m.risk === "low").length,
    dueWithin7Days: maintenance.filter(m => m.predictedServiceInDays <= 7).length,
  };
  const driverSummary = {
    avgSafetyScore: drivers.length ? round(drivers.reduce((s, d) => s + d.safetyScore, 0) / drivers.length, 1) : 0,
    flagged: drivers.filter(d => d.behaviour === "needs-coaching" || d.behaviour === "high-risk").length,
  };
  const fuelSummary = {
    totalMonthlyFuelCostInr: round(fuel.reduce((s, f) => s + f.monthlyFuelCostInr, 0)),
    avgEfficiencyKmpl: fuel.length ? round(fuel.reduce((s, f) => s + f.fuelEfficiencyKmpl, 0) / fuel.length, 2) : 0,
    totalCo2KgPerMonth: round(fuel.reduce((s, f) => s + f.co2KgPerMonth, 0)),
  };

  return { maintenance, maintenanceSummary, drivers, driverSummary, fuel, fuelSummary };
}
