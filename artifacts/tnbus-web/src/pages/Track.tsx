import { motion } from "framer-motion";
import { MapPin, Zap, Clock, Navigation, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBusLocation } from "@workspace/api-client-react";

interface Props { params: { busId: string } }

export default function Track({ params }: Props) {
  const busId = parseInt(params.busId);
  const { data: loc, isLoading } = useGetBusLocation(busId, { query: { enabled: !!busId } });

  const statusColor = (s: string) => {
    if (s === "on-route") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "at-stop") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (s === "delayed") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  // Normalize lat/lng to map percentage position
  const mapX = loc ? ((Number(loc.longitude) - 76.0) / (82.0 - 76.0)) * 100 : 50;
  const mapY = loc ? (1 - (Number(loc.latitude) - 8.0) / (14.0 - 8.0)) * 100 : 50;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Live Bus Tracking</h1>
      {loc && <p className="text-muted-foreground mb-6">Bus {loc.busNumber}</p>}

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative bg-card border border-border/50 rounded-2xl overflow-hidden" style={{ height: 360 }}>
            {/* Stylized Tamil Nadu map background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.3) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
              {/* Route line simulation */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M 15,80 Q 30,60 45,50 Q 60,40 75,25" stroke="rgba(99,102,241,0.4)" strokeWidth="0.5" fill="none" strokeDasharray="2,2" />
                <path d="M 10,70 Q 25,55 40,45 Q 55,35 65,20" stroke="rgba(34,197,94,0.3)" strokeWidth="0.3" fill="none" />
              </svg>
              {/* City dots */}
              {[
                { name: "Chennai", x: 78, y: 18 },
                { name: "Madurai", x: 48, y: 72 },
                { name: "Coimbatore", x: 22, y: 58 },
                { name: "Trichy", x: 55, y: 55 },
                { name: "Salem", x: 38, y: 38 },
              ].map(city => (
                <g key={city.name}>
                  <circle cx={`${city.x}%`} cy={`${city.y}%`} r="2" fill="rgba(99,102,241,0.6)" />
                  <text x={`${city.x + 2}%`} y={`${city.y}%`} fill="rgba(200,200,255,0.5)" fontSize="2.5" dominantBaseline="middle" className="font-sans">{city.name}</text>
                </g>
              ))}
            </div>
            {/* Bus marker */}
            <motion.div
              animate={{ x: `${Math.min(Math.max(mapX, 5), 90)}%`, y: `${Math.min(Math.max(mapY, 5), 90)}%` }}
              transition={{ type: "spring", stiffness: 50 }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${Math.min(Math.max(mapX, 5), 90)}%`, top: `${Math.min(Math.max(mapY, 5), 90)}%` }}
            >
              <div className="relative">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-primary/40 rounded-full" />
                <div className="relative w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/50 border-2 border-primary-foreground/30">
                  <Navigation className="w-4 h-4 text-primary-foreground" style={{ transform: `rotate(${Number(loc.heading)}deg)` }} />
                </div>
              </div>
            </motion.div>

            {/* Info overlay */}
            <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur rounded-xl px-4 py-2 border border-border/50">
              <p className="text-xs text-muted-foreground">Coordinates</p>
              <p className="font-mono text-xs">{Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</p>
            </div>
          </motion.div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Zap className="w-5 h-5" />, label: "Speed", value: `${Number(loc.speed).toFixed(0)} km/h`, color: "text-cyan-400" },
              { icon: <Clock className="w-5 h-5" />, label: "ETA", value: loc.etaMinutes !== null ? `${loc.etaMinutes} mins` : "—", color: "text-primary" },
              { icon: <MapPin className="w-5 h-5" />, label: "Next Stop", value: loc.nextStop ?? "—", color: "text-amber-400" },
              { icon: <Navigation className="w-5 h-5" />, label: "Heading", value: `${Number(loc.heading).toFixed(0)}°`, color: "text-violet-400" },
            ].map(stat => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-2xl p-4">
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Badge className={statusColor(loc.status)}>{loc.status.replace("-", " ")}</Badge>
            <p className="text-xs text-muted-foreground">Last updated: {new Date(loc.lastUpdated).toLocaleTimeString("en-IN")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
