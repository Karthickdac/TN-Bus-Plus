import { motion } from "framer-motion";
import { Bell, CheckCheck, Ticket, RefreshCcw, PartyPopper, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const typeIcon = (type: string) => {
  if (type === "booking") return <Ticket className="w-4 h-4" />;
  if (type === "refund") return <RefreshCcw className="w-4 h-4" />;
  if (type === "festival" || type === "special" || type === "alert") return <PartyPopper className="w-4 h-4" />;
  return <Info className="w-4 h-4" />;
};

const typeColor = (type: string) => {
  if (type === "booking") return "bg-emerald-500/10 text-emerald-500";
  if (type === "refund") return "bg-blue-500/10 text-blue-500";
  if (type === "festival" || type === "special" || type === "alert") return "bg-amber-500/10 text-amber-500";
  return "bg-primary/10 text-primary";
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const passengerId = user?.id ?? 0;

  const { data: notifications, isLoading } = useListNotifications(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getListNotificationsQueryKey(passengerId) },
  });
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const unreadCount = (notifications ?? []).filter(n => !n.isRead).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey(passengerId) });

  const handleMarkAll = async () => {
    try {
      await markAll.mutateAsync({ id: passengerId });
      invalidate();
    } catch {
      toast({ title: "Could not update notifications", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleMarkOne = async (id: number, isRead: boolean) => {
    if (isRead) return;
    try {
      await markOne.mutateAsync({ id });
      invalidate();
    } catch {
      toast({ title: "Could not mark as read", description: "Please try again.", variant: "destructive" });
    }
  };

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-rose-500 text-white rounded-full px-2 py-0.5">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleMarkAll} disabled={markAll.isPending}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : !notifications?.length ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">You're all caught up</p>
          <p className="text-sm text-muted-foreground mt-1">Booking updates, refunds and travel alerts will show here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, i) => (
            <motion.button key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => handleMarkOne(n.id, n.isRead)}
              className={`w-full text-left rounded-2xl p-4 border transition-colors flex gap-3 ${
                n.isRead ? "bg-card border-border/50" : "bg-primary/5 border-primary/30"
              }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeColor(n.type)}`}>
                {typeIcon(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${n.isRead ? "font-medium" : "font-bold"}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground/70 mt-1.5">{fmtDt(n.createdAt)}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
