import { motion } from "framer-motion";
import { Wrench, Gauge, Fuel, AlertTriangle, Leaf, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetOpsAnalytics } from "@workspace/api-client-react";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminOps() {
  const { data: ops, isLoading } = useGetOpsAnalytics();

  const riskBadge = (r: string) => {
    if (r === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (r === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  const behaviourBadge = (b: string) => {
    if (b === "needs-attention" || b === "poor") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (b === "average" || b === "fair") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Gauge className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Predictive Operations</h1>
      </div>
      <p className="text-muted-foreground mb-6">Maintenance, driver behaviour &amp; fuel analytics</p>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : ops && (
        <div className="space-y-8">
          {/* Maintenance */}
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Predictive Maintenance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="High risk" value={String(ops.maintenanceSummary.highRisk)} accent="text-red-400" />
              <StatCard label="Medium risk" value={String(ops.maintenanceSummary.mediumRisk)} accent="text-amber-400" />
              <StatCard label="Low risk" value={String(ops.maintenanceSummary.lowRisk)} accent="text-emerald-400" />
              <StatCard label="Service due ≤7d" value={String(ops.maintenanceSummary.dueWithin7Days)} accent="text-primary" />
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                      <th className="px-4 py-3 font-medium">Bus</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Odometer</th>
                      <th className="px-4 py-3 font-medium text-right">Km since service</th>
                      <th className="px-4 py-3 font-medium text-right">Engine health</th>
                      <th className="px-4 py-3 font-medium text-right">Predicted service</th>
                      <th className="px-4 py-3 font-medium text-right">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {ops.maintenance.map(m => (
                      <tr key={m.busId}>
                        <td className="px-4 py-3 font-mono">{m.busNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.busType}</td>
                        <td className="px-4 py-3 text-right">{m.odometerKm.toLocaleString("en-IN")} km</td>
                        <td className="px-4 py-3 text-right">{m.kmSinceService.toLocaleString("en-IN")} km</td>
                        <td className="px-4 py-3 text-right">
                          <span className={m.engineHealthScore < 60 ? "text-red-400" : m.engineHealthScore < 80 ? "text-amber-400" : "text-emerald-400"}>
                            {m.engineHealthScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{m.predictedServiceInDays}d</td>
                        <td className="px-4 py-3 text-right"><Badge className={`${riskBadge(m.risk)} text-xs capitalize`}>{m.risk}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {/* Driver behaviour */}
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" /> Driver Behaviour</h2>
            <div className="grid grid-cols-2 gap-3 mb-4 max-w-md">
              <StatCard label="Avg safety score" value={ops.driverSummary.avgSafetyScore.toFixed(1)} accent="text-primary" />
              <StatCard label="Flagged drivers" value={String(ops.driverSummary.flagged)} accent={ops.driverSummary.flagged > 0 ? "text-red-400" : "text-emerald-400"} sub="Need review" />
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                      <th className="px-4 py-3 font-medium">Driver</th>
                      <th className="px-4 py-3 font-medium">Bus</th>
                      <th className="px-4 py-3 font-medium text-right">Rating</th>
                      <th className="px-4 py-3 font-medium text-right">Safety</th>
                      <th className="px-4 py-3 font-medium text-right">Harsh braking /100km</th>
                      <th className="px-4 py-3 font-medium text-right">Overspeed</th>
                      <th className="px-4 py-3 font-medium text-right">Idling</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {ops.drivers.map(d => (
                      <tr key={d.busNumber}>
                        <td className="px-4 py-3 font-medium">{d.driverName}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{d.busNumber}</td>
                        <td className="px-4 py-3 text-right">{d.rating.toFixed(1)}★</td>
                        <td className="px-4 py-3 text-right">{d.safetyScore}</td>
                        <td className="px-4 py-3 text-right">{d.harshBrakingPer100km}</td>
                        <td className="px-4 py-3 text-right">{d.overspeedEvents}</td>
                        <td className="px-4 py-3 text-right">{d.idlingPct}%</td>
                        <td className="px-4 py-3 text-right"><Badge className={`${behaviourBadge(d.behaviour)} text-xs capitalize`}>{d.behaviour.replace("-", " ")}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {/* Fuel */}
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Fuel className="w-4 h-4 text-primary" /> Fuel &amp; Emissions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <StatCard label="Monthly fuel cost" value={inr(ops.fuelSummary.totalMonthlyFuelCostInr)} accent="text-primary" />
              <StatCard label="Avg efficiency" value={`${ops.fuelSummary.avgEfficiencyKmpl.toFixed(2)} km/l`} />
              <div className="bg-card border border-border/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Leaf className="w-3 h-3 text-emerald-400" /> CO₂ / month</p>
                <p className="text-2xl font-bold text-emerald-400">{ops.fuelSummary.totalCo2KgPerMonth.toLocaleString("en-IN")} kg</p>
              </div>
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                      <th className="px-4 py-3 font-medium">Bus</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Efficiency</th>
                      <th className="px-4 py-3 font-medium text-right">Monthly km</th>
                      <th className="px-4 py-3 font-medium text-right">Fuel cost</th>
                      <th className="px-4 py-3 font-medium text-right">CO₂/month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {ops.fuel.map(f => (
                      <tr key={f.busId}>
                        <td className="px-4 py-3 font-mono">{f.busNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.busType}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={f.fuelEfficiencyKmpl < 3.5 ? "text-red-400" : f.fuelEfficiencyKmpl < 4.5 ? "text-amber-400" : "text-emerald-400"}>
                            {f.fuelEfficiencyKmpl.toFixed(2)} km/l
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{f.monthlyKm.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right">{inr(f.monthlyFuelCostInr)}</td>
                        <td className="px-4 py-3 text-right">{f.co2KgPerMonth.toLocaleString("en-IN")} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {ops.maintenance.some(m => m.risk === "high") && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">
                {ops.maintenanceSummary.highRisk} bus{ops.maintenanceSummary.highRisk > 1 ? "es" : ""} flagged high-risk — schedule inspection to avoid breakdowns.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
