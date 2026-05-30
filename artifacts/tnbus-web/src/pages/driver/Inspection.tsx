import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInspections,
  useCreateInspection,
  getListInspectionsQueryKey,
  type InspectionItem,
} from "@workspace/api-client-react";
import { ClipboardCheck, Loader2, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const CHECKLIST = [
  "Brakes",
  "Tyres & pressure",
  "Headlights & indicators",
  "Horn",
  "Wipers & mirrors",
  "Engine oil & coolant",
  "Fire extinguisher",
  "First-aid kit",
  "Emergency exit",
  "Seatbelts",
];

export default function Inspection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useListInspections({ query: { queryKey: getListInspectionsQueryKey() } });
  const create = useCreateInspection();
  const [checks, setChecks] = useState<Record<string, boolean>>(() => Object.fromEntries(CHECKLIST.map((l) => [l, true])));
  const [notes, setNotes] = useState("");

  const inspections = data ?? [];
  const allOk = CHECKLIST.every((l) => checks[l]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items: InspectionItem[] = CHECKLIST.map((label) => ({ label, ok: checks[label] }));
    try {
      await create.mutateAsync({ data: { items, notes: notes.trim() || null } });
      await qc.invalidateQueries({ queryKey: getListInspectionsQueryKey() });
      setNotes("");
      toast({ title: "Inspection submitted", description: allOk ? "All checks passed." : "Issues flagged." });
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Driver</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Pre-trip Inspection</h1>
      </header>

      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="space-y-1.5">
          {CHECKLIST.map((label) => {
            const ok = checks[label];
            return (
              <button
                type="button"
                key={label}
                onClick={() => setChecks((c) => ({ ...c, [label]: !c[label] }))}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {ok ? <><Check className="w-3.5 h-3.5" /> OK</> : <><X className="w-3.5 h-3.5" /> Issue</>}
                </span>
              </button>
            );
          })}
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Notes (optional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe any issues" className="mt-1" />
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit inspection
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Recent inspections</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : inspections.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No inspections yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {inspections.map((i) => {
              const failed = i.items.filter((it) => !it.ok);
              return (
                <li key={i.id} className="rounded-xl bg-white border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${i.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {i.passed ? "Passed" : `${failed.length} issue(s)`}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(i.inspectedAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {failed.length > 0 && <p className="text-xs text-rose-600 mt-1.5">{failed.map((f) => f.label).join(", ")}</p>}
                  {i.notes && <p className="text-xs text-slate-500 mt-1">{i.notes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
