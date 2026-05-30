import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bus as BusIcon, Plus, Trash2, Pencil, X, Star, Wrench, CheckCircle,
  AlertTriangle, Fuel, ClipboardCheck, Gauge, IndianRupee, Calendar, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminListBuses,
  useListAdminRoutes,
  useListDepots,
  useCreateBus,
  useUpdateBus,
  useDeleteBus,
  useListBusMaintenance,
  useCreateBusMaintenance,
  useUpdateMaintenance,
  useDeleteMaintenance,
  useListBusFuelLogs,
  useListBusInspections,
  getAdminListBusesQueryKey,
  getListBusMaintenanceQueryKey,
} from "@workspace/api-client-react";
import type { Bus, MaintenanceRecord } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const fieldCls =
  "h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const BUS_TYPES = ["AC Sleeper", "AC Seater", "Non-AC Seater", "Ultra Deluxe", "Super Deluxe", "Ordinary"];
const AMENITY_OPTIONS = ["wifi", "charging", "water", "blanket", "cctv", "toilet", "reading-light", "gps"];
const MAINT_TYPES = ["service", "repair", "tyre", "oil-change", "bodywork", "other"];

type BusForm = {
  busNumber: string;
  busType: string;
  totalSeats: string;
  status: string;
  driverName: string;
  amenities: string[];
  routeId: string;
  depotId: string;
};

type MaintForm = {
  type: string;
  description: string;
  cost: string;
  odometer: string;
  status: string;
  serviceDate: string;
  nextServiceDue: string;
};

const emptyBus: BusForm = {
  busNumber: "", busType: "AC Sleeper", totalSeats: "40", status: "active",
  driverName: "", amenities: [], routeId: "", depotId: "",
};

const emptyMaint: MaintForm = {
  type: "service", description: "", cost: "0", odometer: "", status: "completed",
  serviceDate: "", nextServiceDue: "",
};

function statusBadge(s: string) {
  if (s === "active") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (s === "maintenance") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function statusIcon(s: string) {
  if (s === "active") return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  if (s === "maintenance") return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
}

function maintBadge(s: string) {
  if (s === "completed") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (s === "in-progress") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-amber-500/20 text-amber-400 border-amber-500/30";
}

export default function AdminFleet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: buses, isLoading } = useAdminListBuses();
  const { data: routes } = useListAdminRoutes();
  const { data: depots } = useListDepots();

  const createBus = useCreateBus();
  const updateBus = useUpdateBus();
  const deleteBus = useDeleteBus();

  const [busForm, setBusForm] = useState<BusForm | null>(null);
  const [busEditId, setBusEditId] = useState<number | null>(null);
  const [detailBus, setDetailBus] = useState<Bus | null>(null);

  const refreshBuses = () => queryClient.invalidateQueries({ queryKey: getAdminListBusesQueryKey() });

  const routeLabel = (id?: number | null) => {
    const r = routes?.find(x => x.id === id);
    return r ? `${r.origin} → ${r.destination}` : "Unassigned";
  };
  const depotName = (id?: number | null) => depots?.find(d => d.id === id)?.name ?? "Unassigned";

  const openCreate = () => { setBusEditId(null); setBusForm(emptyBus); };
  const openEdit = (b: Bus) => {
    setBusEditId(b.id);
    setBusForm({
      busNumber: b.busNumber,
      busType: b.busType,
      totalSeats: String(b.totalSeats),
      status: b.status,
      driverName: b.driverName ?? "",
      amenities: b.amenities ?? [],
      routeId: b.routeId != null ? String(b.routeId) : "",
      depotId: b.depotId != null ? String(b.depotId) : "",
    });
  };

  const toggleAmenity = (a: string) => {
    if (!busForm) return;
    setBusForm({
      ...busForm,
      amenities: busForm.amenities.includes(a)
        ? busForm.amenities.filter(x => x !== a)
        : [...busForm.amenities, a],
    });
  };

  const submitBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busForm) return;
    const body = {
      busNumber: busForm.busNumber.trim(),
      busType: busForm.busType,
      totalSeats: Number(busForm.totalSeats) || 0,
      status: busForm.status as "active" | "maintenance" | "breakdown",
      driverName: busForm.driverName.trim() || null,
      amenities: busForm.amenities,
      routeId: busForm.routeId ? Number(busForm.routeId) : null,
      depotId: busForm.depotId ? Number(busForm.depotId) : null,
    };
    try {
      if (busEditId != null) await updateBus.mutateAsync({ id: busEditId, data: body });
      else await createBus.mutateAsync({ data: body });
      refreshBuses();
      setBusForm(null);
      setBusEditId(null);
      toast({ title: busEditId != null ? "Bus updated" : "Bus added" });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast({
        title: "Could not save bus",
        description: status === 409 ? "That bus number is already in use." : "Please check the details and try again.",
        variant: "destructive",
      });
    }
  };

  const removeBus = async (id: number) => {
    try {
      await deleteBus.mutateAsync({ id });
      refreshBuses();
      if (detailBus?.id === id) setDetailBus(null);
      toast({ title: "Bus deleted" });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast({
        title: "Cannot delete bus",
        description: status === 409 ? "This bus still has upcoming schedules." : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const fleet = buses ?? [];
  const counts = {
    total: fleet.length,
    active: fleet.filter(b => b.status === "active").length,
    maintenance: fleet.filter(b => b.status === "maintenance").length,
    breakdown: fleet.filter(b => b.status === "breakdown").length,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <BusIcon className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold">Fleet Management</h1>
      </div>
      <p className="text-muted-foreground mb-6">Register buses, track status, and manage maintenance &amp; service history</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Buses", value: counts.total, icon: BusIcon, color: "text-primary" },
          { label: "Active", value: counts.active, icon: CheckCircle, color: "text-emerald-400" },
          { label: "In Maintenance", value: counts.maintenance, icon: Wrench, color: "text-amber-400" },
          { label: "Breakdown", value: counts.breakdown, icon: AlertTriangle, color: "text-red-400" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{fleet.length} buses registered</p>
        <Button size="sm" className="bg-primary" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Bus</Button>
      </div>

      {busForm && (
        <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitBus}
          className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{busEditId != null ? "Edit Bus" : "New Bus"}</h2>
            <button type="button" onClick={() => { setBusForm(null); setBusEditId(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input value={busForm.busNumber} onChange={e => setBusForm({ ...busForm, busNumber: e.target.value })} placeholder="Bus number (e.g. TN-01-AC-1234)" required />
            <select value={busForm.busType} onChange={e => setBusForm({ ...busForm, busType: e.target.value })} className={fieldCls}>
              {BUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Input type="number" min="1" value={busForm.totalSeats} onChange={e => setBusForm({ ...busForm, totalSeats: e.target.value })} placeholder="Total seats" required />
            <select value={busForm.status} onChange={e => setBusForm({ ...busForm, status: e.target.value })} className={fieldCls}>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="breakdown">Breakdown</option>
            </select>
            <Input value={busForm.driverName} onChange={e => setBusForm({ ...busForm, driverName: e.target.value })} placeholder="Driver name" />
            <select value={busForm.routeId} onChange={e => setBusForm({ ...busForm, routeId: e.target.value })} className={fieldCls}>
              <option value="">Unassigned route</option>
              {(routes ?? []).map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
            </select>
            <select value={busForm.depotId} onChange={e => setBusForm({ ...busForm, depotId: e.target.value })} className={fieldCls}>
              <option value="">Unassigned depot</option>
              {(depots ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${busForm.amenities.includes(a) ? "bg-primary/20 text-primary border-primary/40" : "border-border/60 text-muted-foreground hover:border-primary/30"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="bg-primary" disabled={createBus.isPending || updateBus.isPending}>
            {busEditId != null ? "Save changes" : "Add bus"}
          </Button>
        </motion.form>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : fleet.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
          <BusIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No buses registered yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {fleet.map((bus, i) => (
            <motion.div key={bus.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BusIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono">{bus.busNumber}</p>
                    <p className="text-xs text-muted-foreground">{bus.busType}</p>
                  </div>
                </div>
                <Badge className={`${statusBadge(bus.status)} flex items-center gap-1 text-xs capitalize`}>
                  {statusIcon(bus.status)} {bus.status}
                </Badge>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground mb-3">
                <p>{bus.totalSeats} seats · <Star className="w-3 h-3 inline text-amber-400" /> {Number(bus.punctualityScore).toFixed(1)}%</p>
                {bus.driverName && <p>Driver: <span className="text-foreground">{bus.driverName}</span></p>}
                <p>Route: <span className="text-foreground">{routeLabel(bus.routeId)}</span></p>
                <p>Depot: <span className="text-foreground">{depotName(bus.depotId)}</span></p>
              </div>
              {bus.amenities && bus.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {bus.amenities.slice(0, 4).map(a => <Badge key={a} variant="outline" className="text-xs border-border/50">{a}</Badge>)}
                  {bus.amenities.length > 4 && <Badge variant="outline" className="text-xs border-border/50">+{bus.amenities.length - 4}</Badge>}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => setDetailBus(bus)}>
                  <Wrench className="w-3 h-3 mr-1" /> Manage
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(bus)}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" className="h-8 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => removeBus(bus.id)} disabled={deleteBus.isPending}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BusDetailSheet bus={detailBus} onClose={() => setDetailBus(null)} />
    </div>
  );
}

function BusDetailSheet({ bus, onClose }: { bus: Bus | null; onClose: () => void }) {
  return (
    <Sheet open={bus != null} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {bus && <BusDetail bus={bus} />}
      </SheetContent>
    </Sheet>
  );
}

function BusDetail({ bus }: { bus: Bus }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: maintenance, isLoading: maintLoading } = useListBusMaintenance(bus.id);
  const { data: fuelLogs, isLoading: fuelLoading } = useListBusFuelLogs(bus.id);
  const { data: inspections, isLoading: inspLoading } = useListBusInspections(bus.id);

  const createMaint = useCreateBusMaintenance();
  const updateMaint = useUpdateMaintenance();
  const deleteMaint = useDeleteMaintenance();

  const [tab, setTab] = useState<"maintenance" | "fuel" | "inspections">("maintenance");
  const [maintForm, setMaintForm] = useState<MaintForm | null>(null);
  const [maintEditId, setMaintEditId] = useState<number | null>(null);

  const refreshMaint = () => queryClient.invalidateQueries({ queryKey: getListBusMaintenanceQueryKey(bus.id) });

  const openMaintCreate = () => { setMaintEditId(null); setMaintForm(emptyMaint); };
  const openMaintEdit = (m: MaintenanceRecord) => {
    setMaintEditId(m.id);
    setMaintForm({
      type: m.type,
      description: m.description ?? "",
      cost: String(m.cost),
      odometer: m.odometer != null ? String(m.odometer) : "",
      status: m.status,
      serviceDate: m.serviceDate.slice(0, 10),
      nextServiceDue: m.nextServiceDue ? m.nextServiceDue.slice(0, 10) : "",
    });
  };

  const submitMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintForm) return;
    const body = {
      type: maintForm.type,
      description: maintForm.description.trim() || null,
      cost: Number(maintForm.cost) || 0,
      odometer: maintForm.odometer ? Number(maintForm.odometer) : null,
      status: maintForm.status as "scheduled" | "in-progress" | "completed",
      serviceDate: maintForm.serviceDate ? new Date(maintForm.serviceDate).toISOString() : null,
      nextServiceDue: maintForm.nextServiceDue ? new Date(maintForm.nextServiceDue).toISOString() : null,
    };
    try {
      if (maintEditId != null) await updateMaint.mutateAsync({ id: maintEditId, data: body });
      else await createMaint.mutateAsync({ id: bus.id, data: body });
      refreshMaint();
      setMaintForm(null);
      setMaintEditId(null);
      toast({ title: maintEditId != null ? "Record updated" : "Record added" });
    } catch {
      toast({ title: "Could not save record", variant: "destructive" });
    }
  };

  const removeMaint = async (id: number) => {
    try {
      await deleteMaint.mutateAsync({ id });
      refreshMaint();
      toast({ title: "Record deleted" });
    } catch {
      toast({ title: "Could not delete record", variant: "destructive" });
    }
  };

  const records = maintenance ?? [];
  const totalMaintCost = records.reduce((s, m) => s + m.cost, 0);
  const totalFuelCost = (fuelLogs ?? []).reduce((s, f) => s + f.cost, 0);
  const lastOdometer = records.find(m => m.odometer != null)?.odometer
    ?? (fuelLogs ?? []).find(f => f.odometer != null)?.odometer ?? null;

  const tabBtn = (key: typeof tab, label: string, count: number) => (
    <button onClick={() => setTab(key)}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  );

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle className="font-mono">{bus.busNumber}</SheetTitle>
        <SheetDescription>{bus.busType} · {bus.totalSeats} seats · <span className="capitalize">{bus.status}</span></SheetDescription>
      </SheetHeader>

      {/* Health cards */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Gauge className="w-4 h-4 text-primary mb-1" />
          <p className="text-xs text-muted-foreground">Odometer</p>
          <p className="text-sm font-semibold">{lastOdometer != null ? `${lastOdometer.toLocaleString()} km` : "—"}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Wrench className="w-4 h-4 text-amber-400 mb-1" />
          <p className="text-xs text-muted-foreground">Maint. spend</p>
          <p className="text-sm font-semibold">₹{totalMaintCost.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <Fuel className="w-4 h-4 text-blue-400 mb-1" />
          <p className="text-xs text-muted-foreground">Fuel spend</p>
          <p className="text-sm font-semibold">₹{totalFuelCost.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-4 mb-3 border-b border-border/50 pb-2">
        {tabBtn("maintenance", "Maintenance", records.length)}
        {tabBtn("fuel", "Fuel", (fuelLogs ?? []).length)}
        {tabBtn("inspections", "Inspections", (inspections ?? []).length)}
      </div>

      {tab === "maintenance" && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" className="bg-primary h-8" onClick={openMaintCreate}><Plus className="w-3 h-3 mr-1" /> Add Record</Button>
          </div>

          {maintForm && (
            <form onSubmit={submitMaint} className="bg-card border border-primary/30 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{maintEditId != null ? "Edit Record" : "New Record"}</h3>
                <button type="button" onClick={() => { setMaintForm(null); setMaintEditId(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={maintForm.type} onChange={e => setMaintForm({ ...maintForm, type: e.target.value })} className={fieldCls}>
                  {MAINT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={maintForm.status} onChange={e => setMaintForm({ ...maintForm, status: e.target.value })} className={fieldCls}>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In progress</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <Input type="number" value={maintForm.cost} onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })} placeholder="Cost (₹)" />
                <Input type="number" value={maintForm.odometer} onChange={e => setMaintForm({ ...maintForm, odometer: e.target.value })} placeholder="Odometer (km)" />
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Service date</label>
                  <Input type="date" value={maintForm.serviceDate} onChange={e => setMaintForm({ ...maintForm, serviceDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Next service due</label>
                  <Input type="date" value={maintForm.nextServiceDue} onChange={e => setMaintForm({ ...maintForm, nextServiceDue: e.target.value })} />
                </div>
                <Input className="col-span-2" value={maintForm.description} onChange={e => setMaintForm({ ...maintForm, description: e.target.value })} placeholder="Description / notes" />
              </div>
              <Button type="submit" size="sm" className="bg-primary" disabled={createMaint.isPending || updateMaint.isPending}>
                {maintEditId != null ? "Save changes" : "Add record"}
              </Button>
            </form>
          )}

          {maintLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No maintenance records yet</p>
          ) : (
            <div className="space-y-2">
              {records.map(m => (
                <div key={m.id} className="bg-card border border-border/50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm capitalize">{m.type.replace("-", " ")}</p>
                        <Badge className={`${maintBadge(m.status)} text-xs capitalize`}>{m.status.replace("-", " ")}</Badge>
                      </div>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5 break-words">{m.description}</p>}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{m.cost.toLocaleString()}</span>
                        {m.odometer != null && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{m.odometer.toLocaleString()} km</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(m.serviceDate).toLocaleDateString()}</span>
                        {m.nextServiceDue && <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" />next {new Date(m.nextServiceDue).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openMaintEdit(m)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10" onClick={() => removeMaint(m.id)} disabled={deleteMaint.isPending}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "fuel" && (
        fuelLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (fuelLogs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No fuel logs recorded</p>
        ) : (
          <div className="space-y-2">
            {(fuelLogs ?? []).map(f => (
              <div key={f.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Fuel className="w-3.5 h-3.5 text-blue-400" /> {f.liters} L · {f.fuelType}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(f.loggedAt).toLocaleDateString()}{f.odometer != null ? ` · ${f.odometer.toLocaleString()} km` : ""}</p>
                </div>
                <p className="text-sm font-semibold">₹{f.cost.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "inspections" && (
        inspLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (inspections ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No inspections recorded</p>
        ) : (
          <div className="space-y-2">
            {(inspections ?? []).map(insp => {
              const passedItems = insp.items.filter(it => it.ok).length;
              return (
                <div key={insp.id} className="bg-card border border-border/50 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <ClipboardCheck className={`w-3.5 h-3.5 ${insp.passed ? "text-emerald-400" : "text-red-400"}`} />
                      {insp.passed ? "Passed" : "Failed"}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(insp.inspectedAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{passedItems}/{insp.items.length} checks OK{insp.notes ? ` · ${insp.notes}` : ""}</p>
                </div>
              );
            })}
          </div>
        )
      )}
    </>
  );
}
