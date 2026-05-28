import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetRevenueAnalytics } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminRevenue() {
  const { data: revenue, isLoading } = useGetRevenueAnalytics();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border/50 rounded-xl px-3 py-2 text-xs shadow-lg">
          <p className="text-muted-foreground mb-1">{label}</p>
          <p className="font-semibold text-primary">₹{payload[0]?.value?.toFixed(0)}</p>
          <p className="text-muted-foreground">{payload[1]?.value ?? 0} bookings</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Revenue Analytics</h1>
      <p className="text-muted-foreground mb-6">Financial performance dashboard</p>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : revenue && (
        <div className="space-y-6">
          {/* Total revenue card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-4xl font-bold">₹{revenue.totalRevenue.toFixed(2)}</p>
          </motion.div>

          {/* Daily chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border/50 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Revenue — Last 14 Days</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.bookingsByDay} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.1)" }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} />
                <Bar dataKey="bookings" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* By route */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="font-semibold">By Route</h2>
              </div>
              <div className="divide-y divide-border/30">
                {revenue.revenueByRoute.map((r, i) => (
                  <div key={r.route} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium">{r.route}</p>
                      <p className="text-xs text-muted-foreground">{r.bookings} bookings</p>
                    </div>
                    <span className="font-semibold text-primary">₹{r.revenue.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* By bus type */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="font-semibold">By Bus Type</h2>
              </div>
              <div className="divide-y divide-border/30">
                {revenue.revenueByBusType.map(b => (
                  <div key={b.busType} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium">{b.busType}</p>
                      <p className="text-xs text-muted-foreground">{b.bookings} bookings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">₹{b.revenue.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {revenue.totalRevenue > 0 ? ((b.revenue / revenue.totalRevenue) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
