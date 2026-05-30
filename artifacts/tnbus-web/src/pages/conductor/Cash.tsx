import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCashCollections,
  useCreateCashCollection,
  getListCashCollectionsQueryKey,
} from "@workspace/api-client-react";
import { Wallet, Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Cash() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useListCashCollections({ query: { queryKey: getListCashCollectionsQueryKey() } });
  const create = useCreateCashCollection();
  const [amount, setAmount] = useState("");
  const [tickets, setTickets] = useState("");
  const [notes, setNotes] = useState("");

  const collections = data ?? [];
  const total = collections.reduce((sum, c) => sum + c.amount, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const cnt = parseInt(tickets, 10);
    if (Number.isNaN(amt) || amt < 0 || Number.isNaN(cnt) || cnt < 0) return;
    try {
      await create.mutateAsync({ data: { amount: amt, ticketsCount: cnt, notes: notes.trim() || null } });
      await qc.invalidateQueries({ queryKey: getListCashCollectionsQueryKey() });
      setAmount("");
      setTickets("");
      setNotes("");
      toast({ title: "Cash synced", description: `₹${amt} from ${cnt} tickets recorded.` });
    } catch {
      toast({ title: "Failed to sync", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header>
        <p className="text-sm font-semibold text-emerald-600">Conductor</p>
        <h1 className="text-2xl font-extrabold text-slate-900">Cash Collection</h1>
        <p className="text-sm text-slate-400">Synced today: ₹{total}</p>
      </header>

      <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Amount (₹)</label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Tickets</label>
            <Input type="number" min={0} value={tickets} onChange={(e) => setTickets(e.target.value)} placeholder="0" className="mt-1" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Notes (optional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks" className="mt-1" />
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Sync collection
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Recent collections</h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400">
            <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-300" /> No collections yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {collections.map((c) => (
              <li key={c.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">₹{c.amount}</p>
                  <p className="text-xs text-slate-400">{c.ticketsCount} tickets · {new Date(c.collectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  {c.notes && <p className="text-xs text-slate-500 mt-0.5">{c.notes}</p>}
                </div>
                {c.synced && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
