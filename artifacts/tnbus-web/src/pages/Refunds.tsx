import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight, RefreshCcw, Clock, CheckCircle2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRefunds, getListRefundsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Refunds() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const passengerId = user?.id ?? 0;

  const { data: refunds, isLoading } = useListRefunds(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getListRefundsQueryKey(passengerId) },
  });

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><Clock className="w-3 h-3" /> Processing</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <RefreshCcw className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Refunds</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : !refunds?.length ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No refunds yet</p>
          <p className="text-sm text-muted-foreground mt-1">When you cancel a booking, your refund request appears here to track.</p>
          <Button size="sm" className="mt-4 bg-primary" onClick={() => setLocation("/dashboard/trips")}>View Trips</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border/50 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  {r.origin && r.destination ? (
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{r.origin}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{r.destination}</span>
                    </div>
                  ) : (
                    <div className="font-semibold">Booking #{r.bookingId}</div>
                  )}
                  {r.pnr && <p className="text-xs text-muted-foreground mt-0.5">PNR: <span className="font-mono">{r.pnr}</span></p>}
                </div>
                {statusBadge(r.status)}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">Refund amount</p>
                  <p className="text-lg font-bold text-primary">₹{r.amount.toFixed(2)}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-2.5">
                  <p className="text-xs text-muted-foreground">{r.status === "completed" ? "Credited by" : "Expected by"}</p>
                  <p className="text-sm font-semibold">{fmtDate(r.estimatedDate)}</p>
                </div>
              </div>

              {r.reason && <p className="text-xs text-muted-foreground mt-3">{r.reason}</p>}

              {r.status !== "completed" && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/90">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Refund is being processed — credited to your original payment method within 5-7 working days.</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
