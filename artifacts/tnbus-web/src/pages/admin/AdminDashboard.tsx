import { motion } from "framer-motion";
import { Link } from "wouter";
import { Bus, TrendingUp, Users, Route, AlertCircle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminStats } from "@workspace/api-client-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <div className="inline-block bg-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-2">ADMIN PORTAL</div>
        <h1 className="text-2xl font-bold">Operations Overview</h1>
        <p className="text-muted-foreground">TN Bus+ Fleet Command Center</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Bus className="w-5 h-5" />, label: "Total Buses", value: stats.totalBuses, sub: `${stats.activeBuses} active`, color: "text-primary", bg: "bg-primary/10" },
            { icon: <TrendingUp className="w-5 h-5" />, label: "Revenue Today", value: `₹${stats.revenueToday.toFixed(0)}`, sub: `${stats.totalBookingsToday} bookings`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: <Users className="w-5 h-5" />, label: "Passengers", value: stats.totalPassengers, sub: "registered", color: "text-cyan-400", bg: "bg-cyan-500/10" },
            { icon: <Route className="w-5 h-5" />, label: "Active Routes", value: stats.activeRoutes, sub: "operational", color: "text-violet-400", bg: "bg-violet-500/10" },
            { icon: <CheckCircle className="w-5 h-5" />, label: "On-Time Rate", value: `${stats.onTimePercentage}%`, sub: "last 7 days", color: "text-amber-400", bg: "bg-amber-500/10" },
            { icon: <AlertCircle className="w-5 h-5" />, label: "Open Complaints", value: stats.pendingComplaints, sub: "need attention", color: "text-red-400", bg: "bg-red-500/10" },
            { icon: <Bus className="w-5 h-5" />, label: "Today's Bookings", value: stats.totalBookingsToday, sub: "confirmed", color: "text-blue-400", bg: "bg-blue-500/10" },
            { icon: <TrendingUp className="w-5 h-5" />, label: "Active Buses", value: stats.activeBuses, sub: `of ${stats.totalBuses} total`, color: "text-teal-400", bg: "bg-teal-500/10" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/50 rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold mt-0.5">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick nav */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/admin/fleet", label: "Fleet Management", desc: "Monitor all buses" },
          { href: "/admin/bookings", label: "Bookings", desc: "All ticket records" },
          { href: "/admin/revenue", label: "Revenue Analytics", desc: "Charts & breakdowns" },
          { href: "/admin/complaints", label: "Complaints", desc: "Manage issues" },
        ].map(item => (
          <Link key={item.href} href={item.href}>
            <div className="bg-card border border-border/50 hover:border-primary/30 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
