import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOccupancyReports,
  useCreateOccupancyReport,
  useGetStaffProfile,
  getListOccupancyReportsQueryKey,
  getGetStaffProfileQueryKey,
} from "@workspace/api-client-react";
import { Gauge, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Occupancy() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: profile } = useGetStaffProfile({ query: { queryKey: getGetStaffProfileQueryKey() } });
  const { data, isLoading } = useListOccupancyReports({ query: { queryKey: getListOccupancyReportsQueryKey() } });
  const create = useCreateOccupancyReport();
  const [occupancy, setOccupancy] = useState("");

  const capacity = profile?.bus?.totalSeats ?? 0;
  const reports = data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(occupancy, 10);
    if (Number.isNaN(value) || value < 0) return;
    try {
      await create.mutateAsync({ data: { occupancy: value } });
      await qc.invalidateQueries({ queryKey: getListOccupancyReportsQueryKey() });
      setOccupancy("");
      toast({ title: "Occupancy reported", description: `${value} seats filled.` });
    } catch {
      toast({ title: "Failed to report", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Conductor</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Live Occupancy</h1>
        <p className="text-sm text-slate-400">Bus capacity: {capacity || "—"} seats</p>
      </header>

      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <label className="text-sm font-semibold text-slate-700">Seats currently filled</label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            max={capacity || undefined}
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value)}
            placeholder="e.g. 32"
          />
          <Button type="submit" disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Report
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Recent reports</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400">
            <Gauge className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No reports yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => {
              const pct = r.capacity > 0 ? Math.round((r.occupancy / r.capacity) * 100) : 0;
              return (
                <li key={r.id} className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">{r.occupancy}/{r.capacity} seats</span>
                    <span className="text-slate-400">{new Date(r.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 90 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
