import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Send, Sparkles, TrendingUp, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListComplaints,
  useCreateComplaint,
  useGetComplaintIntel,
  useAnalyzePendingComplaints,
  getListComplaintsQueryKey,
  getGetComplaintIntelQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart } from "recharts";

export default function AdminComplaints() {
  const queryClient = useQueryClient();
  const { data: complaints, isLoading } = useListComplaints();
  const { data: intel, isLoading: intelLoading } = useGetComplaintIntel();
  const createComplaint = useCreateComplaint();
  const analyzePending = useAnalyzePendingComplaints();

  const [showForm, setShowForm] = useState(false);
  const [busNumber, setBusNumber] = useState("");
  const [category, setCategory] = useState("delay");
  const [description, setDescription] = useState("");

  const priorityBadge = (p: string) => {
    if (p === "high" || p === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (p === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const statusBadge = (s: string) => {
    if (s === "resolved" || s === "closed") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "in-review") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const sentimentBadge = (s?: string | null) => {
    if (s === "negative") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (s === "positive") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetComplaintIntelQueryKey() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createComplaint.mutateAsync({
      data: { passengerId: 1, busNumber: busNumber || undefined, category, description },
    });
    refreshAll();
    setShowForm(false);
    setBusNumber("");
    setDescription("");
  };

  const handleAnalyze = async () => {
    await analyzePending.mutateAsync();
    refreshAll();
  };

  const pendingCount = (complaints ?? []).filter(c => !c.aiAnalyzedAt).length;
  const maxDepotTotal = Math.max(1, ...(intel?.depots ?? []).map(d => d.total));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Complaints Intelligence</h1>
          <p className="text-muted-foreground">AI-assisted triage of passenger feedback</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzePending.isPending || pendingCount === 0}
            className="border-primary/40"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {analyzePending.isPending ? "Analysing…" : `Analyse pending${pendingCount ? ` (${pendingCount})` : ""}`}
          </Button>
          <Button size="sm" className="bg-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Submit Complaint"}
          </Button>
        </div>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-3"
        >
          <h2 className="font-semibold">New Complaint</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input value={busNumber} onChange={e => setBusNumber(e.target.value)} placeholder="Bus number (optional)" />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="delay">Delay</option>
              <option value="cleanliness">Cleanliness</option>
              <option value="safety">Safety</option>
              <option value="staff">Staff Behaviour</option>
              <option value="ticketing">Ticketing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            required
          />
          <Button type="submit" className="bg-primary" disabled={createComplaint.isPending}>
            <Send className="w-4 h-4 mr-2" /> Submit
          </Button>
        </motion.form>
      )}

      {/* Intel summary */}
      {intelLoading ? (
        <Skeleton className="h-40 rounded-2xl mb-6" />
      ) : intel && (
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Sentiment breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-5"
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Sentiment Breakdown
            </h2>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {([
                ["Negative", intel.sentimentBreakdown.negative, "text-red-400"],
                ["Neutral", intel.sentimentBreakdown.neutral, "text-slate-400"],
                ["Positive", intel.sentimentBreakdown.positive, "text-emerald-400"],
                ["Unanalysed", intel.sentimentBreakdown.unanalyzed, "text-amber-400"],
              ] as const).map(([label, val, cls]) => (
                <div key={label} className="text-center bg-background/50 rounded-xl py-3">
                  <p className={`text-2xl font-bold ${cls}`}>{val}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={intel.trends} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} allowDecimals={false} width={24} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Total" />
                <Line type="monotone" dataKey="negative" stroke="#f87171" strokeWidth={2} dot={false} name="Negative" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Depot heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card border border-border/50 rounded-2xl p-5"
          >
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" /> Complaints by Depot
            </h2>
            <div className="space-y-3">
              {intel.depots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No complaint data yet.</p>
              ) : (
                intel.depots.map(d => (
                  <div key={`${d.depotId}-${d.depotName}`}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{d.depotName}</span>
                      <span className="text-muted-foreground">
                        {d.total} total · <span className="text-red-400">{d.negative} neg</span>
                        {d.escalated > 0 && <span className="text-amber-400"> · {d.escalated} esc</span>}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-background overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                        style={{ width: `${(d.total / maxDepotTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Complaint list */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (complaints ?? []).length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No complaints on record</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(complaints ?? []).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={`bg-card border rounded-2xl p-5 ${c.escalated ? "border-red-500/40" : "border-border/50"}`}
            >
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <Badge variant="outline" className="capitalize text-xs border-border/60">{c.category}</Badge>
                {c.aiCategory && c.aiCategory !== c.category && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-xs capitalize">
                    <Sparkles className="w-3 h-3 mr-1" /> AI: {c.aiCategory}
                  </Badge>
                )}
                {c.sentiment && (
                  <Badge className={`${sentimentBadge(c.sentiment)} text-xs capitalize`}>{c.sentiment}</Badge>
                )}
                {c.escalated && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Escalated
                  </Badge>
                )}
                <Badge className={`${priorityBadge(c.priority)} text-xs ml-auto`}>{c.priority}</Badge>
                <Badge className={`${statusBadge(c.status)} text-xs`}>{c.status}</Badge>
              </div>
              {c.aiSummary && (
                <div className="flex items-start gap-2 mb-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground/90 italic">{c.aiSummary}</p>
                </div>
              )}
              <p className="text-sm text-foreground mb-2">{c.description}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {c.busNumber && <span>Bus: <span className="font-mono text-foreground">{c.busNumber}</span></span>}
                <span>Passenger #{c.passengerId}</span>
                {typeof c.sentimentScore === "number" && <span>Score: {c.sentimentScore.toFixed(2)}</span>}
                <span>{fmtDt(c.createdAt)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
