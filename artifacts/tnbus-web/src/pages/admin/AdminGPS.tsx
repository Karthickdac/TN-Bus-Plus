import { motion } from "framer-motion";
import { Bus, Wifi, WifiOff, TriangleAlert, Activity, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Marker, Popup } from "react-leaflet";
import { useLocation } from "wouter";
import { useGetFleetLocations, getGetFleetLocationsQueryKey } from "@workspace/api-client-react";
import type { FleetBus } from "@workspace/api-client-react";
import { LiveMap, busIcon, FitBounds } from "@/components/LiveMap";

const markerColor = (b: FleetBus) => {
  if (b.status === "breakdown" || b.topAlertSeverity === "critical") return "#ef4444";
  if (b.topAlertSeverity === "warning") return "#f59e0b";
  if (!b.online) return "#94a3b8";
  if (b.status === "at-stop") return "#3b82f6";
  return "#6366f1";
};

const TN_CENTER: [number, number] = [10.9, 78.5];

export default function AdminGPS() {
  const { data, isLoading } = useGetFleetLocations({
    query: { refetchInterval: 4000, queryKey: getGetFleetLocationsQueryKey() },
  });
  const [, setLocation] = useLocation();

  const buses = data?.buses ?? [];
  const points: [number, number][] = buses.map(b => [b.latitude, b.longitude]);
  const fitKey = buses.map(b => b.busId).sort((a, b) => a - b).join("-");

  const stats = [
    { label: "Tracked", value: data?.summary.total ?? 0, icon: <Bus className="w-5 h-5" />, color: "text-primary" },
    { label: "Online", value: data?.summary.online ?? 0, icon: <Wifi className="w-5 h-5" />, color: "text-emerald-500" },
    { label: "Offline", value: data?.summary.offline ?? 0, icon: <WifiOff className="w-5 h-5" />, color: "text-slate-400" },
    { label: "Active Alerts", value: data?.summary.alerts ?? 0, icon: <TriangleAlert className="w-5 h-5" />, color: "text-amber-500" },
    { label: "Breakdowns", value: data?.summary.breakdowns ?? 0, icon: <Activity className="w-5 h-5" />, color: "text-red-500" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">Live GPS Monitoring</h1>
      <p className="text-muted-foreground mb-6">Real-time fleet positions and safety alerts</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border/50 rounded-2xl p-4">
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-[480px] rounded-2xl" />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 relative border border-border/50 rounded-2xl overflow-hidden z-0"
            style={{ height: 520 }}
          >
            <LiveMap center={TN_CENTER} zoom={7}>
              <FitBounds points={points} fitKey={fitKey} />
              {buses.map(b => (
                <Marker key={b.busId} position={[b.latitude, b.longitude]} icon={busIcon(b.heading, markerColor(b))}>
                  <Popup>
                    <span className="font-mono font-semibold">{b.busNumber}</span> · {b.busType}
                    <br />
                    {Math.round(b.speed)} km/h · {b.status.replace("-", " ")}
                    {b.nextStop && (
                      <>
                        <br />
                        Next: {b.nextStop}
                      </>
                    )}
                    {b.alertCount > 0 && (
                      <>
                        <br />
                        <strong>{b.alertCount} alert(s)</strong>
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}
            </LiveMap>
          </motion.div>

          {/* Fleet list */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {buses.length === 0 && (
              <div className="bg-card border border-border/50 rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No buses currently transmitting.
              </div>
            )}
            {buses.map((b, i) => (
              <motion.div
                key={b.busId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setLocation(`/track/${b.busId}`)}
                className="bg-card border border-border/50 rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono font-semibold text-sm">{b.busNumber}</span>
                  <span
                    className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      b.online
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-slate-400/15 text-slate-500"
                    }`}
                  >
                    {b.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {b.online ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{Math.round(b.speed)} km/h</span>
                  {b.nextStop && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {b.nextStop}
                    </span>
                  )}
                </div>
                {b.alerts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {b.alerts.map((a, j) => (
                      <Badge
                        key={j}
                        className={`text-[10px] ${
                          a.severity === "critical"
                            ? "bg-red-500/15 text-red-600 border-red-500/30"
                            : a.severity === "warning"
                              ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                              : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                        }`}
                      >
                        {a.type.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-600">No alerts</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
