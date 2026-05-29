import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, XCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListBookings, useCancelBooking, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export default function Trips() {
  const [filter, setFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const passengerId = user?.id ?? 0;

  const { data: bookings, isLoading } = useListBookings({ passengerId });
  const cancelBooking = useCancelBooking();

  const filtered = (bookings ?? []).filter(b => filter === "all" || b.status === filter);

  const statusBadge = (s: string) => {
    if (s === "confirmed") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Confirmed</Badge>;
    if (s === "cancelled") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Completed</Badge>;
  };

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this booking? You will receive a refund.")) return;
    await cancelBooking.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ passengerId }) });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">My Trips</h1>

      <div className="flex gap-2 mb-6">
        {["all", "confirmed", "completed", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No trips found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border/50 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    {b.origin} <ArrowRight className="w-4 h-4 text-muted-foreground" /> {b.destination}
                  </div>
                  <p className="text-sm text-muted-foreground">{fmtDt(b.departureTime)}</p>
                </div>
                {statusBadge(b.status)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">PNR</p>
                  <p className="font-mono text-sm font-semibold">{b.pnr}</p>
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

              {b.qrCode && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 border border-border/40 rounded-lg px-3 py-2">
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span className="font-mono">{b.qrCode}</span>
                </div>
              )}

              <div className="flex gap-2">
                {b.status === "confirmed" && (
                  <Button size="sm" variant="destructive" className="text-xs"
                    onClick={() => handleCancel(b.id)}
                    disabled={cancelBooking.isPending}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                )}
                <Badge variant="outline" className={`text-xs ml-auto ${b.paymentStatus === "paid" ? "border-emerald-500/30 text-emerald-400" : b.paymentStatus === "refunded" ? "border-blue-500/30 text-blue-400" : "border-amber-500/30 text-amber-400"}`}>
                  {b.paymentStatus}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
