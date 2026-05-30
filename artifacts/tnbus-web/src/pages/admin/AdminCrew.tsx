import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Building2, Plus, Trash2, Pencil, X, Phone, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListDepots,
  useListCrew,
  useCreateDepot,
  useUpdateDepot,
  useDeleteDepot,
  useCreateCrew,
  useUpdateCrew,
  useDeleteCrew,
  getListDepotsQueryKey,
  getListCrewQueryKey,
} from "@workspace/api-client-react";
import type { Depot, Crew } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type DepotForm = { name: string; code: string; city: string; manager: string; capacity: string };
type CrewForm = {
  name: string;
  role: string;
  depotId: string;
  phone: string;
  licenseNumber: string;
  status: string;
  experienceYears: string;
  safetyScore: string;
  assignedBusNumber: string;
};

const emptyDepot: DepotForm = { name: "", code: "", city: "", manager: "", capacity: "60" };
const emptyCrew: CrewForm = {
  name: "", role: "driver", depotId: "", phone: "", licenseNumber: "",
  status: "off-duty", experienceYears: "0", safetyScore: "80", assignedBusNumber: "",
};

export default function AdminCrew() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: depots, isLoading: depotsLoading } = useListDepots();
  const { data: crew, isLoading: crewLoading } = useListCrew();

  const createDepot = useCreateDepot();
  const updateDepot = useUpdateDepot();
  const deleteDepot = useDeleteDepot();
  const createCrew = useCreateCrew();
  const updateCrew = useUpdateCrew();
  const deleteCrew = useDeleteCrew();

  const [tab, setTab] = useState<"crew" | "depots">("crew");
  const [depotForm, setDepotForm] = useState<DepotForm | null>(null);
  const [depotEditId, setDepotEditId] = useState<number | null>(null);
  const [crewForm, setCrewForm] = useState<CrewForm | null>(null);
  const [crewEditId, setCrewEditId] = useState<number | null>(null);

  const refreshDepots = () => queryClient.invalidateQueries({ queryKey: getListDepotsQueryKey() });
  const refreshCrew = () => queryClient.invalidateQueries({ queryKey: getListCrewQueryKey() });

  const depotName = (id?: number | null) => depots?.find(d => d.id === id)?.name ?? "Unassigned";

  // ---- Depot handlers ----
  const openDepotCreate = () => { setDepotEditId(null); setDepotForm(emptyDepot); };
  const openDepotEdit = (d: Depot) => {
    setDepotEditId(d.id);
    setDepotForm({ name: d.name, code: d.code, city: d.city, manager: d.manager ?? "", capacity: String(d.capacity) });
  };
  const submitDepot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depotForm) return;
    const body = {
      name: depotForm.name,
      code: depotForm.code,
      city: depotForm.city,
      manager: depotForm.manager || null,
      capacity: Number(depotForm.capacity) || 0,
    };
    try {
      if (depotEditId != null) await updateDepot.mutateAsync({ id: depotEditId, data: body });
      else await createDepot.mutateAsync({ data: body });
      refreshDepots();
      setDepotForm(null);
      setDepotEditId(null);
      toast({ title: depotEditId != null ? "Depot updated" : "Depot created" });
    } catch {
      toast({ title: "Could not save depot", variant: "destructive" });
    }
  };
  const removeDepot = async (id: number) => {
    try {
      await deleteDepot.mutateAsync({ id });
      refreshDepots();
      toast({ title: "Depot deleted" });
    } catch {
      toast({ title: "Cannot delete depot", description: "It may still have buses or crew assigned.", variant: "destructive" });
    }
  };

  // ---- Crew handlers ----
  const openCrewCreate = () => { setCrewEditId(null); setCrewForm(emptyCrew); };
  const openCrewEdit = (c: Crew) => {
    setCrewEditId(c.id);
    setCrewForm({
      name: c.name, role: c.role, depotId: c.depotId != null ? String(c.depotId) : "",
      phone: c.phone ?? "", licenseNumber: c.licenseNumber ?? "", status: c.status,
      experienceYears: String(c.experienceYears), safetyScore: String(c.safetyScore),
      assignedBusNumber: c.assignedBusNumber ?? "",
    });
  };
  const submitCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewForm) return;
    const body = {
      name: crewForm.name,
      role: crewForm.role,
      depotId: crewForm.depotId ? Number(crewForm.depotId) : null,
      phone: crewForm.phone || null,
      licenseNumber: crewForm.licenseNumber || null,
      status: crewForm.status,
      experienceYears: Number(crewForm.experienceYears) || 0,
      safetyScore: Number(crewForm.safetyScore) || 0,
      assignedBusNumber: crewForm.assignedBusNumber || null,
    };
    try {
      if (crewEditId != null) await updateCrew.mutateAsync({ id: crewEditId, data: body });
      else await createCrew.mutateAsync({ data: body });
      refreshCrew();
      setCrewForm(null);
      setCrewEditId(null);
      toast({ title: crewEditId != null ? "Crew updated" : "Crew added" });
    } catch {
      toast({ title: "Could not save crew member", variant: "destructive" });
    }
  };
  const removeCrew = async (id: number) => {
    try {
      await deleteCrew.mutateAsync({ id });
      refreshCrew();
      toast({ title: "Crew member removed" });
    } catch {
      toast({ title: "Could not remove crew member", variant: "destructive" });
    }
  };

  const statusBadge = (s: string) => {
    if (s === "on-duty") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (s === "on-leave") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const fieldCls = "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground w-full";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Crew &amp; Depots</h1>
      </div>
      <p className="text-muted-foreground mb-6">Manage depot facilities and on-road staff</p>

      <div className="flex items-center gap-2 mb-6">
        <Button size="sm" variant={tab === "crew" ? "default" : "outline"} onClick={() => setTab("crew")} className={tab === "crew" ? "bg-primary" : ""}>
          <Users className="w-4 h-4 mr-2" /> Crew
        </Button>
        <Button size="sm" variant={tab === "depots" ? "default" : "outline"} onClick={() => setTab("depots")} className={tab === "depots" ? "bg-primary" : ""}>
          <Building2 className="w-4 h-4 mr-2" /> Depots
        </Button>
      </div>

      {tab === "crew" ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{(crew ?? []).length} crew members</p>
            <Button size="sm" className="bg-primary" onClick={openCrewCreate}><Plus className="w-4 h-4 mr-1" /> Add Crew</Button>
          </div>

          {crewForm && (
            <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitCrew}
              className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{crewEditId != null ? "Edit Crew" : "New Crew Member"}</h2>
                <button type="button" onClick={() => { setCrewForm(null); setCrewEditId(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input value={crewForm.name} onChange={e => setCrewForm({ ...crewForm, name: e.target.value })} placeholder="Full name" required />
                <select value={crewForm.role} onChange={e => setCrewForm({ ...crewForm, role: e.target.value })} className={fieldCls}>
                  <option value="driver">Driver</option>
                  <option value="conductor">Conductor</option>
                  <option value="mechanic">Mechanic</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                <select value={crewForm.depotId} onChange={e => setCrewForm({ ...crewForm, depotId: e.target.value })} className={fieldCls}>
                  <option value="">Unassigned depot</option>
                  {(depots ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Input value={crewForm.phone} onChange={e => setCrewForm({ ...crewForm, phone: e.target.value })} placeholder="Phone" />
                <Input value={crewForm.licenseNumber} onChange={e => setCrewForm({ ...crewForm, licenseNumber: e.target.value })} placeholder="Licence no." />
                <Input value={crewForm.assignedBusNumber} onChange={e => setCrewForm({ ...crewForm, assignedBusNumber: e.target.value })} placeholder="Assigned bus" />
                <select value={crewForm.status} onChange={e => setCrewForm({ ...crewForm, status: e.target.value })} className={fieldCls}>
                  <option value="on-duty">On duty</option>
                  <option value="off-duty">Off duty</option>
                  <option value="on-leave">On leave</option>
                </select>
                <Input type="number" value={crewForm.experienceYears} onChange={e => setCrewForm({ ...crewForm, experienceYears: e.target.value })} placeholder="Experience (yrs)" />
                <Input type="number" value={crewForm.safetyScore} onChange={e => setCrewForm({ ...crewForm, safetyScore: e.target.value })} placeholder="Safety score" />
              </div>
              <Button type="submit" className="bg-primary" disabled={createCrew.isPending || updateCrew.isPending}>
                {crewEditId != null ? "Save changes" : "Add crew"}
              </Button>
            </motion.form>
          )}

          {crewLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
          ) : (crew ?? []).length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">No crew members yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(crew ?? []).map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="bg-card border border-border/50 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                    </div>
                    <Badge className={`${statusBadge(c.status)} text-xs capitalize`}>{c.status.replace("-", " ")}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> {depotName(c.depotId)}</p>
                    {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {c.phone}</p>}
                    <p className="flex items-center gap-1.5"><Award className="w-3 h-3" /> {c.experienceYears} yrs · safety {c.safetyScore}</p>
                    {c.assignedBusNumber && <p>Bus: <span className="font-mono text-foreground">{c.assignedBusNumber}</span></p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => openCrewEdit(c)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="outline" className="h-8 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => removeCrew(c.id)} disabled={deleteCrew.isPending}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{(depots ?? []).length} depots</p>
            <Button size="sm" className="bg-primary" onClick={openDepotCreate}><Plus className="w-4 h-4 mr-1" /> Add Depot</Button>
          </div>

          {depotForm && (
            <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitDepot}
              className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{depotEditId != null ? "Edit Depot" : "New Depot"}</h2>
                <button type="button" onClick={() => { setDepotForm(null); setDepotEditId(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input value={depotForm.name} onChange={e => setDepotForm({ ...depotForm, name: e.target.value })} placeholder="Depot name" required />
                <Input value={depotForm.code} onChange={e => setDepotForm({ ...depotForm, code: e.target.value })} placeholder="Code (e.g. MAS)" required />
                <Input value={depotForm.city} onChange={e => setDepotForm({ ...depotForm, city: e.target.value })} placeholder="City" required />
                <Input value={depotForm.manager} onChange={e => setDepotForm({ ...depotForm, manager: e.target.value })} placeholder="Manager" />
                <Input type="number" value={depotForm.capacity} onChange={e => setDepotForm({ ...depotForm, capacity: e.target.value })} placeholder="Capacity" />
              </div>
              <Button type="submit" className="bg-primary" disabled={createDepot.isPending || updateDepot.isPending}>
                {depotEditId != null ? "Save changes" : "Add depot"}
              </Button>
            </motion.form>
          )}

          {depotsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : (depots ?? []).length === 0 ? (
            <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">No depots yet</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(depots ?? []).map((d, i) => {
                const crewCount = (crew ?? []).filter(c => c.depotId === d.id).length;
                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="bg-card border border-border/50 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.city}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs border-border/60">{d.code}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      {d.manager && <p>Manager: <span className="text-foreground">{d.manager}</span></p>}
                      <p>Capacity: <span className="text-foreground">{d.capacity}</span> · Crew: <span className="text-foreground">{crewCount}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => openDepotEdit(d)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button size="sm" variant="outline" className="h-8 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => removeDepot(d.id)} disabled={deleteDepot.isPending}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
