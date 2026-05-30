import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmergencyReports,
  useCreateEmergencyReport,
  getListEmergencyReportsQueryKey,
} from "@workspace/api-client-react";
import { Siren, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const TYPES = ["breakdown", "accident", "medical", "security", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];

const SEV_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-rose-100 text-rose-700",
};

export default function Emergency() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useListEmergencyReports({ query: { queryKey: getListEmergencyReportsQueryKey() } });
  const create = useCreateEmergencyReport();
  const [type, setType] = useState("breakdown");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const reports = data ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    try {
      await create.mutateAsync({ data: { type, severity, description: description.trim(), location: location.trim() || null } });
      await qc.invalidateQueries({ queryKey: getListEmergencyReportsQueryKey() });
      setDescription("");
      setLocation("");
      toast({ title: "Emergency reported", description: "Control room has been notified." });
    } catch {
      toast({ title: "Failed to report", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-rose-600">Driver</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Emergency Report</h1>
        <p className="text-sm text-slate-400">Notify the control room immediately.</p>
      </header>

      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize">
              {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm capitalize">
              {SEVERITIES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Location (optional)</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. NH44, near Krishnagiri" className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened"
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full bg-rose-600 hover:bg-rose-700 gap-2">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send report
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Recent reports</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400">
            <Siren className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No reports filed.
          </div>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-white border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 capitalize">{r.type}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${SEV_STYLE[r.severity] ?? SEV_STYLE.medium}`}>{r.severity}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{r.description}</p>
                <div className="flex items-center justify-between mt-1.5 text-xs text-slate-400">
                  <span>{r.location ?? "Location not set"}</span>
                  <span className="capitalize">{r.status} · {new Date(r.reportedAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
