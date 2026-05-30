import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFuelLogs,
  useCreateFuelLog,
  getListFuelLogsQueryKey,
} from "@workspace/api-client-react";
import { Fuel as FuelIcon, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const FUEL_TYPES = ["diesel", "cng", "electric"];

export default function Fuel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useListFuelLogs({ query: { queryKey: getListFuelLogsQueryKey() } });
  const create = useCreateFuelLog();
  const [liters, setLiters] = useState("");
  const [cost, setCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelType, setFuelType] = useState("diesel");

  const logs = data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lit = parseFloat(liters);
    const cst = parseFloat(cost);
    if (Number.isNaN(lit) || lit <= 0 || Number.isNaN(cst) || cst < 0) return;
    const odo = odometer.trim() ? parseInt(odometer, 10) : null;
    try {
      await create.mutateAsync({ data: { liters: lit, cost: cst, odometer: odo, fuelType } });
      await qc.invalidateQueries({ queryKey: getListFuelLogsQueryKey() });
      setLiters("");
      setCost("");
      setOdometer("");
      toast({ title: "Fuel logged", description: `${lit} L for ₹${cst}.` });
    } catch {
      toast({ title: "Failed to log fuel", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Driver</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Fuel Log</h1>
      </header>

      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Litres</label>
            <Input type="number" min={0} step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Cost (₹)</label>
            <Input type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Odometer (km)</label>
            <Input type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="optional" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Fuel type</label>
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize">
              {FUEL_TYPES.map((f) => <option key={f} value={f} className="capitalize">{f}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Log fuel
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Recent logs</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400">
            <FuelIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No fuel logs yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => (
              <li key={l.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{l.liters} L · ₹{l.cost}</p>
                  <p className="text-xs text-slate-400 capitalize">{l.fuelType}{l.odometer != null ? ` · ${l.odometer} km` : ""} · {new Date(l.loggedAt).toLocaleDateString([], { day: "2-digit", month: "short" })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
