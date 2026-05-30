import { useGetManifest, getGetManifestQueryKey } from "@workspace/api-client-react";
import { Users, CheckCircle2, Clock, Ticket, Loader2 } from "lucide-react";

export default function Manifest() {
  const { data, isLoading } = useGetManifest(undefined, { query: { queryKey: getGetManifestQueryKey() } });
  const entries = data ?? [];
  const validated = entries.filter((e) => e.validated).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Conductor</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Passenger Manifest</h1>
        <p className="text-sm text-slate-400">{entries.length} booked · {validated} validated</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          No bookings found for your bus today.
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.bookingId} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{e.passengerName}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Ticket className="w-3 h-3" /> {e.pnr}</p>
                </div>
                {e.validated ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Boarded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full shrink-0">
                    <Clock className="w-3.5 h-3.5" /> Awaiting
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-slate-400">Seats</span>
                <span className="font-medium text-right">{e.seatNumbers.join(", ")}</span>
                <span className="text-slate-400">Route</span>
                <span className="font-medium text-right truncate">{e.origin} → {e.destination}</span>
                <span className="text-slate-400">Fare</span>
                <span className="font-medium text-right">₹{e.totalFare}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
