import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, Clock, Users, ChevronRight, Shield, Wifi, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBus, useGetSeats } from "@workspace/api-client-react";

interface Props { params: { id: string } }

const amenityIcon = (a: string) => {
  if (a.toLowerCase().includes("wifi")) return <Wifi className="w-3.5 h-3.5" />;
  if (a.toLowerCase().includes("usb") || a.toLowerCase().includes("charg")) return <Zap className="w-3.5 h-3.5" />;
  if (a.toLowerCase().includes("gps")) return <MapPin className="w-3.5 h-3.5" />;
  if (a.toLowerCase().includes("ac")) return <Shield className="w-3.5 h-3.5" />;
  return null;
};

export default function BusDetail({ params }: Props) {
  const busId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const scheduleId = parseInt(new URLSearchParams(search).get("scheduleId") ?? "1");

  const { data: bus, isLoading: busLoading } = useGetBus(busId, { query: { enabled: !!busId } });
  const { data: seats, isLoading: seatsLoading } = useGetSeats(scheduleId, { query: { enabled: !!scheduleId } });

  const [selected, setSelected] = useState<string[]>([]);

  const maxRows = seats ? Math.max(...seats.map(s => s.row)) : 0;
  const maxCols = seats ? Math.max(...seats.map(s => s.column)) : 4;

  const toggleSeat = (num: string, avail: boolean) => {
    if (!avail) return;
    setSelected(prev => prev.includes(num) ? prev.filter(s => s !== num) : [...prev, num]);
  };

  const selectedSeatData = seats?.filter(s => selected.includes(s.seatNumber)) ?? [];
  const total = selectedSeatData.reduce((sum, s) => sum + s.price, 0);

  if (busLoading || seatsLoading) return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {bus && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{bus.busNumber}</h1>
              <p className="text-muted-foreground">{bus.busType}</p>
              {bus.driverName && <p className="text-sm text-muted-foreground mt-1">Driver: {bus.driverName}</p>}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="font-semibold">{Number(bus.punctualityScore).toFixed(1)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">On-time rate</p>
              <Badge className={`mt-1 ${bus.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
                {bus.status}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {bus.amenities?.map(a => (
              <Badge key={a} variant="outline" className="border-primary/20 text-xs gap-1">
                {amenityIcon(a)} {a}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Seat Layout */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border border-border/50 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Seats</h2>
        <div className="flex gap-3 mb-4 flex-wrap text-xs">
          <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-primary/30 border border-primary/50" />Available</div>
          <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-muted border border-border" />Taken</div>
          <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-rose-500/30 border border-rose-500/50" />Women Only</div>
          <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded bg-emerald-500/50 border border-emerald-500" />Selected</div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`, minWidth: `${maxCols * 48}px` }}>
            {Array.from({ length: maxRows }, (_, ri) => {
              const row = seats?.filter(s => s.row === ri + 1) ?? [];
              return row.map(seat => {
                const isSelected = selected.includes(seat.seatNumber);
                const base = "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-pointer select-none ";
                const style = !seat.isAvailable
                  ? base + "bg-muted border border-border cursor-not-allowed opacity-50"
                  : isSelected
                  ? base + "bg-emerald-500 border border-emerald-400 text-white scale-105"
                  : seat.isWomenOnly
                  ? base + "bg-rose-500/30 border border-rose-500/50 hover:bg-rose-500/50 text-rose-300"
                  : base + "bg-primary/20 border border-primary/40 hover:bg-primary/40 text-primary-foreground";
                return (
                  <div key={seat.seatNumber} className={style} onClick={() => toggleSeat(seat.seatNumber, seat.isAvailable)} title={seat.seatNumber}>
                    {seat.seatNumber}
                  </div>
                );
              });
            })}
          </div>
        </div>
      </motion.div>

      {/* Booking summary */}
      {selected.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Selected: {selected.join(", ")}</p>
            <p className="text-2xl font-bold text-primary">₹{total.toFixed(2)}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 px-8"
            onClick={() => setLocation(`/book?scheduleId=${scheduleId}&seats=${selected.join(",")}&fare=${total}`)}>
            Proceed to Book <ChevronRight className="ml-1 w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}

import { useState } from "react";
