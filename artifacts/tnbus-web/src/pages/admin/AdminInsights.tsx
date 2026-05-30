import { motion } from "framer-motion";
import { Sparkles, TrendingUp, MapPin, Clock, CalendarDays, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAiInsights, useGetPassengerDemand } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminInsights() {
  const { data: insights, isLoading: insightsLoading } = useGetAiInsights();
  const { data: demand, isLoading: demandLoading } = useGetPassengerDemand();

  const severityColor = (s: string) => {
    if (s === "high" || s === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (s === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (s === "positive" || s === "good") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const maxHour = Math.max(1, ...(demand?.byHour ?? []).map(h => h.bookings));
  const maxDay = Math.max(1, ...(demand?.byDay ?? []).map(d => d.bookings));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">AI Insights</h1>
      </div>
      <p className="text-muted-foreground mb-6">Plain-language analysis of operations &amp; passenger demand</p>

      {/* AI insight cards */}
      {insightsLoading ? (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : insights && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> What needs your attention</h2>
            <span className="text-xs text-muted-foreground">
              {insights.source === "ai" ? "AI-generated" : "Heuristic"} · {new Date(insights.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {insights.insights.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="bg-card border border-border/50 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm">{ins.title}</h3>
                  <Badge className={`${severityColor(ins.severity)} text-xs capitalize shrink-0`}>{ins.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{ins.detail}</p>
                <Badge variant="outline" className="text-[10px] capitalize border-border/60">{ins.category}</Badge>
              </motion.div>
            ))}
            {insights.insights.length === 0 && (
              <p className="text-sm text-muted-foreground">No insights available yet.</p>
            )}
          </div>
        </>
      )}

      {/* Passenger demand */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Passenger Demand Heatmap</h2>
      </div>
      {demandLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      ) : demand && (
        <div className="space-y-6">
          {/* Hourly */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-5"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Bookings by Hour</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={demand.byHour} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={h => `${h}:00`} interval={1} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} allowDecimals={false} width={24} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={h => `${h}:00`}
                />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Day-of-week heat row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card border border-border/50 rounded-2xl p-5"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Bookings by Day</h3>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map(label => {
                  const row = demand.byDay.find(d => d.day === label);
                  const val = row?.bookings ?? 0;
                  const intensity = val / maxDay;
                  return (
                    <div key={label} className="text-center">
                      <div
                        className="aspect-square rounded-lg flex items-center justify-center text-sm font-semibold mb-1 border border-border/40"
                        style={{ background: `hsl(var(--primary) / ${0.12 + intensity * 0.6})` }}
                      >
                        {val}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Top routes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border/50 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Top Routes by Demand</h3>
              </div>
              <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                {demand.byRoute.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  demand.byRoute.map(r => (
                    <div key={r.label} className="flex items-center justify-between px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.bookings} bookings</p>
                      </div>
                      <span className="font-semibold text-primary">₹{r.revenue.toFixed(0)}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Origins / Destinations */}
          <div className="grid lg:grid-cols-2 gap-6">
            {([
              ["Top Origins", demand.byOrigin],
              ["Top Destinations", demand.byDestination],
            ] as const).map(([title, rows], idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-border/50">
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <div className="divide-y divide-border/30">
                  {rows.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">No data.</p>
                  ) : (
                    rows.slice(0, 6).map(r => (
                      <div key={r.label} className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground">{r.bookings} bookings</span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
