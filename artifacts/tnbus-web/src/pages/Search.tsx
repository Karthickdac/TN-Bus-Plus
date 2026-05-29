import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  MapPin, Clock, Zap, Users, Star, ChevronRight, SlidersHorizontal, ArrowUpDown,
  Wifi, Plug, Navigation, Bath, ShieldCheck, Moon, CalendarDays, Sofa, Smile, TrendingUp, TrendingDown, Minus, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSearchBuses, useGetFareCalendar, getGetFareCalendarQueryKey,
  useListSavedRoutes, useCreateSavedRoute, useDeleteSavedRoute, getListSavedRoutesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type FilterKey =
  | "ac" | "sleeper" | "chargingPort" | "liveGps" | "toilet"
  | "womenFriendly" | "lowCrowd" | "nightBus";

const FILTERS: { key: FilterKey; label: string; icon: typeof Wifi }[] = [
  { key: "ac", label: "AC", icon: Wifi },
  { key: "sleeper", label: "Sleeper", icon: Sofa },
  { key: "chargingPort", label: "Charging", icon: Plug },
  { key: "liveGps", label: "Live GPS", icon: Navigation },
  { key: "toilet", label: "Toilet", icon: Bath },
  { key: "womenFriendly", label: "Women-friendly", icon: ShieldCheck },
  { key: "lowCrowd", label: "Low crowd", icon: Users },
  { key: "nightBus", label: "Night bus", icon: Moon },
];

export default function Search() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const passengerId = user?.id ?? 0;
  const params = new URLSearchParams(search);
  const [origin, setOrigin] = useState(params.get("origin") ?? "");
  const [destination, setDestination] = useState(params.get("destination") ?? "");
  const [date, setDate] = useState(params.get("date") ?? "");
  const [showCalendar, setShowCalendar] = useState(false);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    ac: false, sleeper: false, chargingPort: false, liveGps: false,
    toilet: false, womenFriendly: params.get("women") === "1", lowCrowd: false, nightBus: false,
  });
  const [sortBy, setSortBy] = useState<"fare" | "departure" | "seats" | "rating">("departure");

  const toggleFilter = (k: FilterKey) => setFilters(f => ({ ...f, [k]: !f[k] }));

  const { data: buses, isLoading } = useSearchBuses({
    origin: origin || "",
    destination: destination || "",
    date: date || "",
    ac: filters.ac || undefined,
    sleeper: filters.sleeper || undefined,
    chargingPort: filters.chargingPort || undefined,
    liveGps: filters.liveGps || undefined,
    toilet: filters.toilet || undefined,
    womenFriendly: filters.womenFriendly || undefined,
    lowCrowd: filters.lowCrowd || undefined,
    nightBus: filters.nightBus || undefined,
  });

  const fareParams = { origin: origin || "", destination: destination || "", days: 14 };
  const { data: fareCalendar } = useGetFareCalendar(
    fareParams,
    { query: { enabled: showCalendar && !!origin && !!destination, queryKey: getGetFareCalendarQueryKey(fareParams) } },
  );

  const { data: savedRoutes } = useListSavedRoutes(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getListSavedRoutesQueryKey(passengerId) },
  });
  const createSavedRoute = useCreateSavedRoute();
  const deleteSavedRoute = useDeleteSavedRoute();

  const savedFor = (o: string, d: string) =>
    (savedRoutes ?? []).find(r => r.origin === o && r.destination === d);

  const toggleFavorite = async (o: string, d: string) => {
    if (passengerId <= 0) {
      toast({ title: "Sign in to save routes", description: "Log in to favorite routes for quick access." });
      return;
    }
    const existing = savedFor(o, d);
    try {
      if (existing) {
        await deleteSavedRoute.mutateAsync({ id: existing.id });
        toast({ title: "Route removed", description: `${o} → ${d} removed from saved routes.` });
      } else {
        await createSavedRoute.mutateAsync({ data: { passengerId, origin: o, destination: d } });
        toast({ title: "Route saved", description: `${o} → ${d} added to saved routes.` });
      }
      queryClient.invalidateQueries({ queryKey: getListSavedRoutesQueryKey(passengerId) });
    } catch {
      toast({ title: "Something went wrong", description: "Could not update saved routes. Please try again.", variant: "destructive" });
    }
  };

  const sorted = [...(buses ?? [])].sort((a, b) => {
    if (sortBy === "fare") return a.fare - b.fare;
    if (sortBy === "seats") return b.availableSeats - a.availableSeats;
    if (sortBy === "rating") return (b.safetyRating ?? 0) - (a.safetyRating ?? 0);
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
  const fmtDay = (d: string) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const trendIcon = (t: string | undefined) => {
    if (t === "rising") return <TrendingUp className="inline w-3 h-3 text-red-400" />;
    if (t === "falling") return <TrendingDown className="inline w-3 h-3 text-emerald-400" />;
    return <Minus className="inline w-3 h-3 text-muted-foreground" />;
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
            <Button
              variant={showCalendar ? "default" : "outline"}
              size="sm"
              className="h-10 gap-1.5"
              onClick={() => setShowCalendar(s => !s)}
            >
              <CalendarDays className="w-4 h-4" /> Fare calendar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Fare calendar */}
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                <CalendarDays className="w-4 h-4 text-primary" /> Cheapest days to travel
              </div>
              {!origin || !destination ? (
                <p className="text-sm text-muted-foreground">Enter a From and To city to see fares by date.</p>
              ) : !fareCalendar ? (
                <div className="flex gap-2">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-20 w-24 rounded-xl" />)}</div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {fareCalendar.map(day => (
                    <button
                      key={day.date}
                      onClick={() => setDate(day.date)}
                      className={`shrink-0 w-24 rounded-xl border p-3 text-center transition-all ${
                        date === day.date
                          ? "border-primary bg-primary/10"
                          : day.isCheapest
                          ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">{fmtDay(day.date)}</div>
                      <div className={`text-base font-bold mt-1 ${day.isCheapest ? "text-emerald-400" : "text-foreground"}`}>₹{day.fare}</div>
                      {day.isCheapest && <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">Cheapest</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          {FILTERS.map(({ key, label, icon: Icon }) => {
            const active = filters[key];
            const isWomen = key === "womenFriendly";
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  active
                    ? isWomen
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-primary text-primary-foreground border-primary"
                    : `border-border/60 text-muted-foreground hover:border-${isWomen ? "pink" : "primary"}-400/40`
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            {(["departure", "fare", "seats", "rating"] as const).map(s => (
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
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No buses found</p>
            <p className="text-sm mt-1">Try searching Chennai to Madurai, or relax your filters</p>
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
                      {bus.isNightBus && (
                        <Badge variant="outline" className="text-[10px] border-indigo-500/40 text-indigo-300 gap-1 ml-1">
                          <Moon className="w-2.5 h-2.5" /> Night
                        </Badge>
                      )}
                    </div>

                    {/* Trust scores */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      <span className="flex items-center gap-1 text-amber-400" title="On-time rate">
                        <Clock className="w-3 h-3" /> {bus.punctualityScore?.toFixed(0)}% on time
                      </span>
                      <span className="flex items-center gap-1 text-sky-300" title="Comfort score">
                        <Sofa className="w-3 h-3" /> {bus.comfortScore?.toFixed(1)} comfort
                      </span>
                      <span className="flex items-center gap-1 text-emerald-300" title="Safety rating">
                        <ShieldCheck className="w-3 h-3" /> {bus.safetyRating?.toFixed(1)} safety
                      </span>
                      <span className="flex items-center gap-1 text-violet-300" title="Driver rating">
                        <Smile className="w-3 h-3" /> {bus.driverRating?.toFixed(1)} driver
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs border-border/60 text-muted-foreground">{bus.busType}</Badge>
                      {bus.amenities?.slice(0, 3).map(a => (
                        <Badge key={a} variant="secondary" className="text-xs bg-secondary/30">{a}</Badge>
                      ))}
                    </div>

                    {bus.nearbyBoardingPoints && bus.nearbyBoardingPoints.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>Boarding near: <span className="text-foreground/70">{bus.nearbyBoardingPoints.join(" · ")}</span></span>
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-1.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleFavorite(bus.origin, bus.destination)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                          savedFor(bus.origin, bus.destination)
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                            : "border-border/60 text-muted-foreground hover:text-rose-500 hover:border-rose-500/40"
                        }`}
                        title={savedFor(bus.origin, bus.destination) ? "Remove from saved routes" : "Save this route"}
                        aria-label="Toggle saved route"
                      >
                        <Heart className={`w-4 h-4 ${savedFor(bus.origin, bus.destination) ? "fill-rose-500" : ""}`} />
                      </button>
                      <div className="text-2xl font-bold text-primary">₹{bus.fare}</div>
                    </div>
                    <div className="text-xs text-muted-foreground" title="Predicted fare trend">
                      {trendIcon(bus.fareTrend)} <span className="capitalize">{bus.fareTrend ?? "stable"}</span>
                    </div>
                    <div className={`text-xs font-medium ${crowdColor(bus.crowdDensity)}`}>
                      <Users className="inline w-3 h-3 mr-1" />
                      {bus.crowdDensity ?? "low"} crowd
                    </div>
                    <div className="text-xs text-muted-foreground">{bus.availableSeats} seats left</div>
                    {bus.estimatedDelay && bus.estimatedDelay > 0 ? (
                      <div className="text-xs text-amber-400">~{bus.estimatedDelay}m delay likely</div>
                    ) : (
                      <div className="text-xs text-emerald-400">On schedule</div>
                    )}
                    <Button size="sm" className="mt-2 w-full bg-primary hover:bg-primary/90"
                      onClick={() => setLocation(`/bus/${bus.busId}?scheduleId=${bus.scheduleId}`)}>
                      Select Seats
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Bus No: {bus.busNumber}{bus.driverName ? ` · Driver: ${bus.driverName}` : ""}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
