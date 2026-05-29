import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight, History as HistoryIcon, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListBookings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function History() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const passengerId = user?.id ?? 0;

  const { data: bookings, isLoading } = useListBookings({ passengerId });

  const past = (bookings ?? []).filter(b => b.status === "completed" || b.status === "cancelled");

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <HistoryIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Travel History</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : past.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <HistoryIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No past journeys yet</p>
          <p className="text-sm text-muted-foreground mt-1">Completed and cancelled trips will appear here.</p>
          <Button size="sm" className="mt-4 bg-primary" onClick={() => setLocation("/search")}>Book a Trip</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {past.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border/50 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <span className="truncate">{b.origin}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{b.destination}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{fmtDt(b.departureTime)}</p>
                </div>
                {b.status === "completed" ? (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1 shrink-0"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 shrink-0"><XCircle className="w-3 h-3" /> Cancelled</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">PNR</p>
                  <p className="font-mono text-sm font-semibold truncate">{b.pnr}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">Seats</p>
                  <p className="text-sm font-semibold">{b.seatNumbers?.join(", ")}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">Bus</p>
                  <p className="text-sm font-semibold">{b.busNumber}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">Fare</p>
                  <p className="text-sm font-bold text-primary">₹{b.totalFare}</p>
                </div>
              </div>
              {b.status === "cancelled" && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => setLocation(`/search?origin=${encodeURIComponent(b.origin)}&destination=${encodeURIComponent(b.destination)}`)}>
                    Rebook this route
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
