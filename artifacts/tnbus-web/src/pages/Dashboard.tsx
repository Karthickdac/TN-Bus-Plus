import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { TrendingUp, Wallet, Star, MapPin, Clock, ChevronRight, Bus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDashboardStats,
  useGetUpcomingTrips,
  useGetPopularRoutes,
} from "@workspace/api-client-react";

const PASSENGER_ID = 1;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ passengerId: PASSENGER_ID });
  const { data: upcoming, isLoading: upcomingLoading } = useGetUpcomingTrips({ passengerId: PASSENGER_ID });
  const { data: popular } = useGetPopularRoutes();

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Arun</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : stats && (
          <>
            {[
              { icon: <Bus className="w-5 h-5" />, label: "Total Trips", value: stats.totalTrips, color: "text-primary", bg: "bg-primary/10" },
              { icon: <Wallet className="w-5 h-5" />, label: "Wallet Balance", value: `₹${stats.walletBalance.toFixed(2)}`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { icon: <Star className="w-5 h-5" />, label: "Reward Points", value: stats.rewardPoints, color: "text-amber-400", bg: "bg-amber-500/10" },
              { icon: <TrendingUp className="w-5 h-5" />, label: "Total Spent", value: `₹${stats.totalSpent.toFixed(0)}`, color: "text-violet-400", bg: "bg-violet-500/10" },
              { icon: <Clock className="w-5 h-5" />, label: "Upcoming Trips", value: stats.upcomingTrips, color: "text-cyan-400", bg: "bg-cyan-500/10" },
              { icon: <MapPin className="w-5 h-5" />, label: "Saved Routes", value: stats.savedRoutes, color: "text-rose-400", bg: "bg-rose-500/10" },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-5">
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming trips */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Upcoming Trips</h2>
            <Link href="/dashboard/trips" className="text-sm text-primary hover:underline flex items-center gap-1">
              All trips <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : !upcoming?.length ? (
            <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
              <Bus className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No upcoming trips</p>
              <Button size="sm" className="mt-3 bg-primary" onClick={() => setLocation("/")}>Book a Trip</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 2).map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                  className="bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/dashboard/trips`)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>{b.origin}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{b.destination}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDt(b.departureTime)}</p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">{b.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>PNR: <span className="font-mono text-foreground">{b.pnr}</span></span>
                    <span>Seats: {b.seatNumbers?.join(", ")}</span>
                    <span className="ml-auto font-semibold text-primary">₹{b.totalFare}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Popular routes */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Popular Routes</h2>
          <div className="space-y-3">
            {(popular ?? []).slice(0, 4).map((route, i) => (
              <motion.div key={`${route.origin}-${route.destination}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setLocation(`/search?origin=${route.origin}&destination=${route.destination}`)}>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span>{route.origin}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span>{route.destination}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{route.bookingsCount} bookings</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-sm">₹{route.avgFare.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">avg fare</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
