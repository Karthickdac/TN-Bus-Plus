import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminListBookings } from "@workspace/api-client-react";

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: bookings, isLoading } = useAdminListBookings({
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  const statusBadge = (s: string) => {
    if (s === "confirmed") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "cancelled") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">All Bookings</h1>
      <p className="text-muted-foreground mb-6">Complete ticket and booking records</p>

      <div className="flex gap-2 mb-6">
        {["all", "confirmed", "completed", "cancelled"].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${statusFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-6 px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border/50 uppercase tracking-wider">
            <span>PNR</span>
            <span className="col-span-2">Route</span>
            <span>Passenger</span>
            <span>Fare</span>
            <span>Status</span>
          </div>
          {(bookings ?? []).map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-6 px-4 py-3.5 items-center border-b border-border/30 last:border-0 hover:bg-background/30 transition-colors">
              <span className="font-mono text-xs text-primary">{b.pnr}</span>
              <span className="col-span-2 text-sm flex items-center gap-1">
                {b.origin} <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" /> {b.destination}
              </span>
              <span className="text-sm truncate">{b.passengerName}</span>
              <span className="font-semibold text-sm">₹{b.totalFare}</span>
              <Badge className={`${statusBadge(b.status)} w-fit text-xs`}>{b.status}</Badge>
            </motion.div>
          ))}
          {(bookings ?? []).length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No bookings found</div>
          )}
        </div>
      )}
    </div>
  );
}
