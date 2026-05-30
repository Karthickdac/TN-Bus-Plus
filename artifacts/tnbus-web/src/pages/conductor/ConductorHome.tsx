import { Link } from "wouter";
import { ScanLine, Users, Gauge, Wallet, Bus, MapPin, ArrowRight } from "lucide-react";
import { useGetStaffProfile, useGetManifest } from "@workspace/api-client-react";
import { getGetStaffProfileQueryKey, getGetManifestQueryKey } from "@workspace/api-client-react";

const TILES = [
  { href: "/conductor/validate", label: "Validate Ticket", desc: "Scan QR or enter PNR", icon: ScanLine, color: "from-emerald-500 to-teal-600" },
  { href: "/conductor/manifest", label: "Passenger Manifest", desc: "Who's booked on board", icon: Users, color: "from-sky-500 to-blue-600" },
  { href: "/conductor/occupancy", label: "Live Occupancy", desc: "Report seats filled", icon: Gauge, color: "from-violet-500 to-purple-600" },
  { href: "/conductor/cash", label: "Cash Collection", desc: "Sync on-board cash", icon: Wallet, color: "from-amber-500 to-orange-600" },
];

export default function ConductorHome() {
  const { data: profile } = useGetStaffProfile({ query: { queryKey: getGetStaffProfileQueryKey() } });
  const { data: manifest } = useGetManifest(undefined, { query: { queryKey: getGetManifestQueryKey() } });

  const booked = manifest?.length ?? 0;
  const validated = manifest?.filter((m) => m.validated).length ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Conductor Portal</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {profile?.crew?.name ? `Welcome, ${profile.crew.name.split(" ")[0]}` : "Welcome aboard"}
        </h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium"><Bus className="w-4 h-4" /> Assigned bus</div>
          <p className="mt-1 text-lg font-bold text-slate-900">{profile?.bus?.busNumber ?? "—"}</p>
          <p className="text-xs text-slate-400">{profile?.bus?.busType ?? "Not assigned"}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium"><MapPin className="w-4 h-4" /> Depot</div>
          <p className="mt-1 text-lg font-bold text-slate-900">{profile?.depot?.name ?? "—"}</p>
          <p className="text-xs text-slate-400">{profile?.depot?.city ?? ""}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium"><Users className="w-4 h-4" /> Today</div>
          <p className="mt-1 text-lg font-bold text-slate-900">{validated}/{booked}</p>
          <p className="text-xs text-slate-400">tickets validated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="group rounded-2xl bg-white border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{t.label}</p>
                <p className="text-sm text-slate-400 truncate">{t.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
