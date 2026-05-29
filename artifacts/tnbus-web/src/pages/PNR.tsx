import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGetPnrStatus } from "@workspace/api-client-react";
import TicketQR from "@/components/TicketQR";

export default function PNR() {
  const [query, setQuery] = useState("");
  const [pnr, setPnr] = useState<string | null>(null);

  const { data: booking, isLoading, error } = useGetPnrStatus(pnr ?? "", {
    query: { enabled: !!pnr }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setPnr(query.trim().toUpperCase());
  };

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "cancelled") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  };

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center mb-2">PNR Status</h1>
        <p className="text-muted-foreground text-center mb-8">Enter your PNR number to check your booking status</p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. TN20260101"
              className="pl-9 h-12 text-center font-mono uppercase tracking-widest"
            />
          </div>
          <Button type="submit" className="h-12 px-6 bg-primary">Check</Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mb-8">Try: TN20260101 or TN20260102</p>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-card border border-border/50 rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Looking up PNR...</p>
            </motion.div>
          )}

          {error && (
            <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="font-semibold">PNR Not Found</p>
              <p className="text-sm text-muted-foreground mt-1">Double-check your PNR number and try again</p>
            </motion.div>
          )}

          {booking && !isLoading && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-card border border-border/50 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-5 border-b border-border/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PNR Number</p>
                    <p className="text-2xl font-mono font-bold tracking-widest text-primary">{booking.pnr}</p>
                  </div>
                  <Badge className={statusColor(booking.status)}>{booking.status}</Badge>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-semibold">{booking.origin}</p>
                    <p className="text-sm text-muted-foreground">{fmtDt(booking.departureTime)}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 text-right">
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-semibold">{booking.destination}</p>
                    <p className="text-sm text-muted-foreground">{fmtDt(booking.arrivalTime)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Bus</p>
                    <p className="font-medium">{booking.busNumber}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Seats</p>
                    <p className="font-medium">{booking.seatNumbers?.join(", ")}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Passenger</p>
                    <p className="font-medium">{booking.passengerName}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Total Fare</p>
                    <p className="font-bold text-primary">₹{booking.totalFare}</p>
                  </div>
                </div>

                {booking.status === "confirmed" && (
                  <div className="border border-border/50 rounded-xl p-4 flex items-center gap-4">
                    <TicketQR booking={booking} size={96} />
                    <div>
                      <p className="text-sm font-medium">Scan to verify</p>
                      <p className="text-xs text-muted-foreground">Present this e-ticket QR at boarding.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
