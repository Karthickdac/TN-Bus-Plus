import { motion } from "framer-motion";
import { Bus, MapPin, Star, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminListBuses } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export default function AdminFleet() {
  const { data: buses, isLoading } = useAdminListBuses();
  const [, setLocation] = useLocation();

  const statusIcon = (s: string) => {
    if (s === "active") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (s === "maintenance") return <Wrench className="w-4 h-4 text-amber-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  const statusBadge = (s: string) => {
    if (s === "active") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "maintenance") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Fleet Management</h1>
      <p className="text-muted-foreground mb-6">All registered buses and their current status</p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {(buses ?? []).map((bus, i) => (
            <motion.div key={bus.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/50 rounded-2xl p-4 flex flex-wrap gap-4 items-center hover:border-primary/20 transition-colors cursor-pointer"
              onClick={() => setLocation(`/track/${bus.id}`)}>
              <div className="flex items-center gap-3 min-w-[140px]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold font-mono">{bus.busNumber}</p>
                  <p className="text-xs text-muted-foreground">{bus.busType}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>{bus.totalSeats} seats</span>
              </div>
              {bus.driverName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Driver: </span>
                  <span>{bus.driverName}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 flex-1">
                {bus.amenities?.slice(0, 3).map(a => (
                  <Badge key={a} variant="outline" className="text-xs border-border/50">{a}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>{Number(bus.punctualityScore).toFixed(1)}%</span>
                </div>
                <Badge className={`${statusBadge(bus.status)} flex items-center gap-1`}>
                  {statusIcon(bus.status)} {bus.status}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
