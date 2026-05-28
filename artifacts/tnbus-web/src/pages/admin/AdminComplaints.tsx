import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useListComplaints, useCreateComplaint, getListComplaintsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminComplaints() {
  const queryClient = useQueryClient();
  const { data: complaints, isLoading } = useListComplaints();
  const createComplaint = useCreateComplaint();

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

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createComplaint.mutateAsync({
      data: { passengerId: 1, busNumber: busNumber || undefined, category, description }
    });
    queryClient.invalidateQueries({ queryKey: getListComplaintsQueryKey() });
    setShowForm(false);
    setBusNumber(""); setDescription("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Complaints</h1>
          <p className="text-muted-foreground">Manage passenger feedback and issues</p>
        </div>
        <Button size="sm" className="bg-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Submit Complaint"}
        </Button>
      </div>

      {showForm && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold">New Complaint</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input value={busNumber} onChange={e => setBusNumber(e.target.value)} placeholder="Bus number (optional)" />
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
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

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (complaints ?? []).length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No complaints on record</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(complaints ?? []).map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/50 rounded-2xl p-5">
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <Badge variant="outline" className="capitalize text-xs border-border/60">{c.category}</Badge>
                <Badge className={`${priorityBadge(c.priority)} text-xs`}>{c.priority}</Badge>
                <Badge className={`${statusBadge(c.status)} text-xs ml-auto`}>{c.status}</Badge>
              </div>
              <p className="text-sm text-foreground mb-2">{c.description}</p>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {c.busNumber && <span>Bus: <span className="font-mono text-foreground">{c.busNumber}</span></span>}
                <span>Passenger #{c.passengerId}</span>
                <span>{fmtDt(c.createdAt)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
