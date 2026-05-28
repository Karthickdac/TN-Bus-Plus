import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Clock, Zap, Users, Star, ChevronRight, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchBuses } from "@workspace/api-client-react";

export default function Search() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [origin, setOrigin] = useState(params.get("origin") ?? "");
  const [destination, setDestination] = useState(params.get("destination") ?? "");
  const [date, setDate] = useState(params.get("date") ?? "");
  const [filterAc, setFilterAc] = useState(false);
  const [filterSleeper, setFilterSleeper] = useState(false);
  const [sortBy, setSortBy] = useState<"fare" | "departure" | "seats">("departure");

  const { data: buses, isLoading } = useSearchBuses({
    origin: origin || undefined,
    destination: destination || undefined,
    date: date || undefined,
    ac: filterAc ? true : undefined,
    sleeper: filterSleeper ? true : undefined,
  });

  const sorted = [...(buses ?? [])].sort((a, b) => {
    if (sortBy === "fare") return a.fare - b.fare;
    if (sortBy === "seats") return b.availableSeats - a.availableSeats;
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
  });

  const crowdColor = (density: string | undefined) => {
    if (density === "low") return "text-emerald-400";
    if (density === "medium") return "text-amber-400";
    return "text-red-400";
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const fmtDur = (dep: string, arr: string) => {
    const m = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000);
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search bar strip */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur sticky top-16 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[130px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="From" className="pl-8 h-10 bg-background/50 text-sm" />
            </div>
            <div className="relative flex-1 min-w-[130px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="To" className="pl-8 h-10 bg-background/50 text-sm" />
            </div>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 bg-background/50 text-sm w-36 text-foreground" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setFilterAc(!filterAc)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterAc ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
          >
            AC
          </button>
          <button
            onClick={() => setFilterSleeper(!filterSleeper)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterSleeper ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
          >
            Sleeper
          </button>
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            {(["departure", "fare", "seats"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${sortBy === s ? "bg-secondary text-secondary-foreground border-secondary" : "border-border/60 text-muted-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No buses found</p>
            <p className="text-sm mt-1">Try searching Chennai to Madurai</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((bus, i) => (
              <motion.div
                key={bus.scheduleId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{fmtTime(bus.departureTime)}</span>
                      <div className="flex-1 h-px bg-border/60 relative mx-2">
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">{fmtDur(bus.departureTime, bus.arrivalTime)}</span>
                      </div>
                      <span className="font-bold text-lg">{fmtTime(bus.arrivalTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{bus.origin}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{bus.destination}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">{bus.busType}</Badge>
                      {bus.amenities?.slice(0, 3).map(a => (
                        <Badge key={a} variant="secondary" className="text-xs bg-secondary/30">{a}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right space-y-1.5">
                    <div className="text-2xl font-bold text-primary">₹{bus.fare}</div>
                    <div className={`text-xs font-medium ${crowdColor(bus.crowdDensity)}`}>
                      <Users className="inline w-3 h-3 mr-1" />
                      {bus.crowdDensity ?? "low"} crowd
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      {bus.punctualityScore?.toFixed(1)}% on time
                    </div>
                    <div className="text-xs text-muted-foreground">{bus.availableSeats} seats left</div>
                    {bus.estimatedDelay && bus.estimatedDelay > 0 && (
                      <div className="text-xs text-amber-400">~{bus.estimatedDelay}m delay expected</div>
                    )}
                    <Button size="sm" className="mt-2 w-full bg-primary hover:bg-primary/90"
                      onClick={() => setLocation(`/bus/${bus.busId}?scheduleId=${bus.scheduleId}`)}>
                      Select Seats
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Bus No: {bus.busNumber}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
