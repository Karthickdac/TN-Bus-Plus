import { Link } from "wouter";
import { CalendarClock, Fuel, ClipboardCheck, Siren, Bus, MapPin, ArrowRight } from "lucide-react";
import {
  useGetStaffProfile,
  useGetDriverDuty,
  getGetStaffProfileQueryKey,
  getGetDriverDutyQueryKey,
} from "@workspace/api-client-react";

const TILES = [
  { href: "/driver/duty", label: "Duty Schedule", desc: "Today's assigned trips", icon: CalendarClock, color: "from-sky-500 to-blue-600" },
  { href: "/driver/fuel", label: "Fuel Log", desc: "Record refuelling", icon: Fuel, color: "from-amber-500 to-orange-600" },
  { href: "/driver/inspection", label: "Inspection", desc: "Pre-trip checklist", icon: ClipboardCheck, color: "from-emerald-500 to-teal-600" },
  { href: "/driver/emergency", label: "Emergency", desc: "Report an incident", icon: Siren, color: "from-rose-500 to-red-600" },
];

export default function DriverHome() {
  const { data: profile } = useGetStaffProfile({ query: { queryKey: getGetStaffProfileQueryKey() } });
  const { data: duty } = useGetDriverDuty({ query: { queryKey: getGetDriverDutyQueryKey() } });

  const next = duty?.[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Driver Portal</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {profile?.crew?.name ? `Welcome, ${profile.crew.name.split(" ")[0]}` : "Welcome"}
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
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium"><CalendarClock className="w-4 h-4" /> Next trip</div>
          {next ? (
            <>
              <p className="mt-1 text-lg font-bold text-slate-900 truncate">{next.origin} → {next.destination}</p>
              <p className="text-xs text-slate-400">{new Date(next.departureTime).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-bold text-slate-400">No trips</p>
          )}
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
