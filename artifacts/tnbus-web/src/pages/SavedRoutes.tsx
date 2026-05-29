import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { MapPin, ArrowRight, Trash2, Search as SearchIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListSavedRoutes,
  useDeleteSavedRoute,
  getListSavedRoutesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function SavedRoutes() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const passengerId = user?.id ?? 0;

  const { data: routes, isLoading } = useListSavedRoutes(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getListSavedRoutesQueryKey(passengerId) },
  });
  const deleteRoute = useDeleteSavedRoute();

  const handleDelete = async (id: number) => {
    try {
      await deleteRoute.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSavedRoutesQueryKey(passengerId) });
    } catch {
      toast({ title: "Could not remove route", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-rose-500" />
        <h1 className="text-2xl font-bold">Saved Routes</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : !routes?.length ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">No saved routes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Tap the heart on any search to save a route here.</p>
          <Button size="sm" className="mt-4 bg-primary" onClick={() => setLocation("/search")}>Find Buses</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-border/50 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold truncate">
                    <span className="truncate">{r.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{r.destination}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Saved route</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-8 text-xs"
                  onClick={() => setLocation(`/search?origin=${encodeURIComponent(r.origin)}&destination=${encodeURIComponent(r.destination)}`)}>
                  <SearchIcon className="w-3.5 h-3.5 sm:mr-1" /> <span className="hidden sm:inline">Search</span>
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                  onClick={() => handleDelete(r.id)} disabled={deleteRoute.isPending}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
