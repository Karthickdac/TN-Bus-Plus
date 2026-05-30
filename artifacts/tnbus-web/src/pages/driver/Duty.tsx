import { useGetDriverDuty, getGetDriverDutyQueryKey } from "@workspace/api-client-react";
import { CalendarClock, Loader2, ArrowRight, Armchair } from "lucide-react";

export default function Duty() {
  const { data, isLoading } = useGetDriverDuty({ query: { queryKey: getGetDriverDutyQueryKey() } });
  const trips = data ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Driver</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Duty Schedule</h1>
        <p className="text-sm text-slate-400">{trips.length} upcoming trips</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-400">
          <CalendarClock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No trips scheduled for your bus.
        </div>
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <li key={t.scheduleId} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{new Date(t.departureTime).toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" })}</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{t.busType}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 font-bold text-slate-900">
                <span>{t.origin}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span>{t.destination}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                <span>{new Date(t.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → {new Date(t.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex items-center gap-1"><Armchair className="w-3.5 h-3.5" /> {t.availableSeats} free</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
