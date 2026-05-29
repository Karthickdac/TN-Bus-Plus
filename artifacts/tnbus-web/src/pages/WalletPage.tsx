import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Wallet, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetWallet } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

export default function WalletPage() {
  const { user } = useAuth();
  const { data: wallet, isLoading } = useGetWallet(user?.id ?? 0);

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Wallet</h1>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : wallet && (
        <>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/20 via-primary/10 to-violet-500/10 border border-primary/30 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm">Available Balance</span>
                </div>
                <p className="text-4xl font-bold">₹{wallet.balance.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400 justify-end mb-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-semibold">{wallet.rewardPoints}</span>
                </div>
                <p className="text-xs text-muted-foreground">Reward Points</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50">
              <h2 className="font-semibold">Transaction History</h2>
            </div>
            <div className="divide-y divide-border/30">
              {wallet.transactions.map((t, i) => {
                const isCredit = t.type === "credit" || Number(t.amount) > 0;
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-background/30 transition-colors">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                      {isCredit ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{fmtDt(t.createdAt)}</p>
                    </div>
                    <p className={`font-semibold tabular-nums shrink-0 ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                      {isCredit ? "+" : ""}₹{Math.abs(Number(t.amount)).toFixed(2)}
                    </p>
                  </motion.div>
                );
              })}
              {wallet.transactions.length === 0 && (
                <div className="px-5 py-12 text-center text-muted-foreground text-sm">No transactions yet</div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
