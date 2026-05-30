import { motion } from "framer-motion";
import {
  MapPin,
  Zap,
  Clock,
  Navigation,
  AlertCircle,
  Flag,
  Gauge,
  Wifi,
  WifiOff,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Marker, Polyline, Popup } from "react-leaflet";
import { useGetBusLocation, getGetBusLocationQueryKey } from "@workspace/api-client-react";
import type { TrackAlert } from "@workspace/api-client-react";
import { LiveMap, busIcon, stopIcon, PanTo } from "@/components/LiveMap";
import SosButton from "@/components/SosButton";

interface Props {
  params: { busId: string };
}

const statusColor = (s: string) => {
  if (s === "on-route") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (s === "at-stop") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (s === "delayed") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-red-500/15 text-red-600 border-red-500/30";
};

const alertStyle = (sev: string) =>
  sev === "critical"
    ? "bg-red-500/10 text-red-700 border-red-500/30"
    : sev === "warning"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-blue-500/10 text-blue-700 border-blue-500/30";

const alertIcon = (type: string) => {
  if (type === "overspeed") return <Gauge className="w-4 h-4 shrink-0" />;
  if (type === "deviation") return <Navigation className="w-4 h-4 shrink-0" />;
  if (type === "breakdown") return <TriangleAlert className="w-4 h-4 shrink-0" />;
  if (type === "stale_signal") return <WifiOff className="w-4 h-4 shrink-0" />;
  return <ShieldAlert className="w-4 h-4 shrink-0" />;
};

const markerColor = (status: string, alerts: TrackAlert[]) => {
  if (status === "breakdown" || alerts.some(a => a.severity === "critical")) return "#ef4444";
  if (alerts.some(a => a.severity === "warning")) return "#f59e0b";
  if (status === "at-stop") return "#3b82f6";
  return "#6366f1";
};

export default function Track({ params }: Props) {
  const busId = parseInt(params.busId);
  const { data: loc, isLoading } = useGetBusLocation(busId, {
    query: { enabled: !!busId, refetchInterval: 4000, queryKey: getGetBusLocationQueryKey(busId) },
  });

  const polyline: [number, number][] = (loc?.route?.polyline ?? []).map(p => [p.lat, p.lng]);
  const isStale = loc?.alerts.some(a => a.type === "stale_signal") ?? false;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Live Bus Tracking</h1>
          {loc && (
            <p className="text-muted-foreground">
              Bus <span className="font-mono">{loc.busNumber}</span>
              {loc.route && ` · ${loc.route.origin} → ${loc.route.destination}`}
            </p>
          )}
        </div>
        {loc && (
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              isStale
                ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
            }`}
          >
            {isStale ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {isStale ? "Signal stale" : "Live"}
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : !loc ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tracking data for bus {busId}</p>
          <p className="text-sm text-muted-foreground mt-1">Try bus IDs 1–6</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative border border-border/50 rounded-2xl overflow-hidden z-0"
            style={{ height: 400 }}
          >
            <LiveMap center={[loc.latitude, loc.longitude]} zoom={8}>
              {polyline.length > 1 && (
                <Polyline positions={polyline} pathOptions={{ color: "#6366f1", weight: 4, opacity: 0.7 }} />
              )}
              {(loc.route?.stops ?? []).map(s => (
                <Marker key={`${s.name}-${s.lat}`} position={[s.lat, s.lng]} icon={stopIcon(s.passed)}>
                  <Popup>
                    <span className="font-medium">{s.name}</span>
                    {s.passed ? " · passed" : " · upcoming"}
                  </Popup>
                </Marker>
              ))}
              <Marker position={[loc.latitude, loc.longitude]} icon={busIcon(loc.heading, markerColor(loc.status, loc.alerts))}>
                <Popup>
                  <span className="font-mono font-semibold">{loc.busNumber}</span>
                  <br />
                  {Math.round(loc.speed)} km/h · {loc.status.replace("-", " ")}
                </Popup>
              </Marker>
              <PanTo lat={loc.latitude} lng={loc.longitude} />
            </LiveMap>
          </motion.div>

          {/* Safety alerts */}
          {loc.alerts.length > 0 && (
            <div className="space-y-2">
              {loc.alerts.map((a, i) => (
                <motion.div
                  key={`${a.type}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2.5 text-sm px-4 py-2.5 rounded-xl border ${alertStyle(a.severity)}`}
                >
                  {alertIcon(a.type)}
                  <span>{a.message}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Zap className="w-5 h-5" />, label: "Speed", value: `${Math.round(loc.speed)} km/h`, color: "text-cyan-500" },
              { icon: <Clock className="w-5 h-5" />, label: "ETA Next Stop", value: loc.etaMinutes != null ? `${loc.etaMinutes} min` : "—", color: "text-primary" },
              { icon: <Flag className="w-5 h-5" />, label: "ETA Destination", value: loc.etaToDestinationMinutes != null ? `${loc.etaToDestinationMinutes} min` : "—", color: "text-emerald-500" },
              { icon: <MapPin className="w-5 h-5" />, label: "Next Stop", value: loc.nextStop ?? "—", color: "text-amber-500" },
            ].map(stat => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-4"
              >
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold truncate">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={statusColor(loc.status)}>{loc.status.replace("-", " ")}</Badge>
            <p className="text-xs text-muted-foreground">
              Updated {new Date(loc.lastUpdated).toLocaleTimeString("en-IN")} · refreshes automatically
            </p>
          </div>
        </div>
      )}

      {loc && (
        <SosButton
          context={{
            busNumber: loc.busNumber,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            nextStop: loc.nextStop,
            speed: Number(loc.speed),
          }}
        />
      )}
    </div>
  );
}
