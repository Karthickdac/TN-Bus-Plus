import { useState } from "react";
import { motion } from "framer-motion";
import { Route as RouteIcon, Plus, Pencil, Trash2, MapPin, Clock, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdminRoutes,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
  getListAdminRoutesQueryKey,
} from "@workspace/api-client-react";
import type { Route as RouteType, RouteInput } from "@workspace/api-client-react";

const empty: RouteInput = { origin: "", destination: "", distanceKm: 0, durationMinutes: 0, basefare: 0, stops: [] };

export default function AdminRoutes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: routes, isLoading } = useListAdminRoutes();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<RouteInput>(empty);
  const [stopsText, setStopsText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RouteType | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminRoutesQueryKey() });

  const createMut = useCreateRoute({
    mutation: {
      onSuccess: () => {
        invalidate();
        setOpen(false);
        toast({ title: "Route created" });
      },
      onError: () => toast({ title: "Could not create route", variant: "destructive" }),
    },
  });
  const updateMut = useUpdateRoute({
    mutation: {
      onSuccess: () => {
        invalidate();
        setOpen(false);
        toast({ title: "Route updated" });
      },
      onError: () => toast({ title: "Could not update route", variant: "destructive" }),
    },
  });
  const deleteMut = useDeleteRoute({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDeleteTarget(null);
        toast({ title: "Route deleted" });
      },
      onError: () => toast({ title: "Could not delete route", variant: "destructive" }),
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setStopsText("");
    setOpen(true);
  };

  const openEdit = (r: RouteType) => {
    setEditId(r.id);
    setForm({
      origin: r.origin,
      destination: r.destination,
      distanceKm: Number(r.distanceKm),
      durationMinutes: r.durationMinutes,
      basefare: Number(r.basefare),
      stops: r.stops ?? [],
    });
    setStopsText((r.stops ?? []).join(", "));
    setOpen(true);
  };

  const submit = () => {
    const payload: RouteInput = {
      ...form,
      distanceKm: Number(form.distanceKm),
      durationMinutes: Number(form.durationMinutes),
      basefare: Number(form.basefare),
      stops: stopsText.split(",").map(s => s.trim()).filter(Boolean),
    };
    if (editId != null) updateMut.mutate({ id: editId, data: payload });
    else createMut.mutate({ data: payload });
  };

  const saving = createMut.isPending || updateMut.isPending;
  const valid = form.origin.trim() && form.destination.trim() && form.distanceKm > 0 && form.durationMinutes > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Route Management</h1>
          <p className="text-muted-foreground">Create and manage scheduled bus routes</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add Route
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (routes ?? []).length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <RouteIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No routes yet</p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add your first route
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(routes ?? []).map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/50 rounded-2xl p-4 flex flex-wrap gap-4 items-center"
            >
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <RouteIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{r.origin} → {r.destination}</p>
                  {(r.stops ?? []).length > 0 && (
                    <p className="text-xs text-muted-foreground">via {(r.stops ?? []).join(", ")}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-1">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {Number(r.distanceKm)} km</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.durationMinutes} min</span>
                <Badge variant="outline" className="border-border/50 flex items-center gap-0.5">
                  <IndianRupee className="w-3 h-3" />{Number(r.basefare)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit route">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)} aria-label="Delete route" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId != null ? "Edit Route" : "Add Route"}</DialogTitle>
            <DialogDescription>Fares are in ₹ and durations in minutes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="origin">Origin</Label>
                <Input id="origin" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="Chennai" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="destination">Destination</Label>
                <Input id="destination" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="Madurai" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stops">Intermediate stops (comma separated)</Label>
              <Input id="stops" value={stopsText} onChange={e => setStopsText(e.target.value)} placeholder="Villupuram, Trichy" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="distance">Distance (km)</Label>
                <Input id="distance" type="number" min={0} value={form.distanceKm || ""} onChange={e => setForm({ ...form, distanceKm: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" min={0} value={form.durationMinutes || ""} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fare">Base fare (₹)</Label>
                <Input id="fare" type="number" min={0} value={form.basefare || ""} onChange={e => setForm({ ...form, basefare: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!valid || saving}>
              {saving ? "Saving…" : editId != null ? "Save changes" : "Create route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete route?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `${deleteTarget.origin} → ${deleteTarget.destination} will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteTarget && deleteMut.mutate({ id: deleteTarget.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
