import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Wallet, Star, Plus, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetWallet,
  useCreateWalletTopUpOrder,
  useVerifyPayment,
  useRedeemRewardPoints,
  getGetWalletQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loadRazorpay, openRazorpayCheckout, PaymentCancelledError } from "@/lib/razorpay";

const TOPUP_PRESETS = [100, 200, 500, 1000];

function readApiError(err: unknown, fallback: string): string {
  const data = (err as { data?: unknown } | undefined)?.data;
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  return fallback;
}

export default function WalletPage() {
  const { user, refresh } = useAuth();
  const passengerId = user?.id ?? 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: wallet, isLoading } = useGetWallet(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getGetWalletQueryKey(passengerId) },
  });
  const topUpOrder = useCreateWalletTopUpOrder();
  const verifyPayment = useVerifyPayment();
  const redeem = useRedeemRewardPoints();
  const topUpPending = topUpOrder.isPending || verifyPayment.isPending;

  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState<string>("500");
  const [redeemPoints, setRedeemPoints] = useState<string>("");
  const [showRedeem, setShowRedeem] = useState(false);

  const fmtDt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  const refreshWallet = async () => {
    await queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(passengerId) });
    await refresh();
  };

  const handleTopUp = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load the payment gateway. Please try again.");

      const order = await topUpOrder.mutateAsync({ id: passengerId, data: { amount: amt } });

      const success = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.name ?? "TN Bus+ Wallet",
        description: order.description ?? `Add ₹${amt.toFixed(2)} to wallet`,
        prefill: { name: user?.name, contact: user?.phone, email: user?.email },
      });

      await verifyPayment.mutateAsync({
        data: {
          razorpayOrderId: success.razorpay_order_id,
          razorpayPaymentId: success.razorpay_payment_id,
          razorpaySignature: success.razorpay_signature,
        },
      });

      await refreshWallet();
      setShowTopUp(false);
      toast({ title: "Wallet topped up", description: `₹${amt.toFixed(2)} added to your wallet.` });
    } catch (err) {
      if (err instanceof PaymentCancelledError) {
        toast({ title: "Payment cancelled", description: err.message });
        return;
      }
      const msg = err instanceof Error && !(err as { data?: unknown }).data
        ? err.message
        : readApiError(err, "Please try again.");
      toast({ title: "Top-up failed", description: msg, variant: "destructive" });
    }
  };

  const handleRedeem = async () => {
    const pts = Math.floor(Number(redeemPoints));
    if (!(pts > 0)) {
      toast({ title: "Enter points to redeem", variant: "destructive" });
      return;
    }
    try {
      await redeem.mutateAsync({ id: passengerId, data: { points: pts } });
      await refreshWallet();
      setShowRedeem(false);
      setRedeemPoints("");
      toast({ title: "Points redeemed", description: `₹${pts.toFixed(2)} credited to your wallet.` });
    } catch (err) {
      toast({ title: "Redeem failed", description: readApiError(err, "Please try again."), variant: "destructive" });
    }
  };

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
            className="bg-gradient-to-br from-primary/20 via-primary/10 to-violet-500/10 border border-primary/30 rounded-2xl p-6 mb-4">
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

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button className="h-11 bg-primary hover:bg-primary/90" onClick={() => { setShowTopUp(v => !v); setShowRedeem(false); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Money
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={wallet.rewardPoints <= 0}
              onClick={() => { setShowRedeem(v => !v); setShowTopUp(false); setRedeemPoints(String(wallet.rewardPoints)); }}
            >
              <Gift className="w-4 h-4 mr-2" /> Redeem Points
            </Button>
          </div>

          {/* Top-up panel */}
          {showTopUp && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Add Money</h2>
                <button onClick={() => setShowTopUp(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {TOPUP_PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`rounded-xl py-2 text-sm font-medium border transition-colors ${Number(amount) === p ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-primary/5"}`}
                  >
                    ₹{p}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="mb-3"
              />
              <p className="text-xs text-muted-foreground mb-3 text-center">Secure payment by Razorpay · 256-bit SSL</p>
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleTopUp} disabled={topUpPending}>
                {topUpPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : `Add ₹${Number(amount || 0).toFixed(0)}`}
              </Button>
            </motion.div>
          )}

          {/* Redeem panel */}
          {showRedeem && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Redeem Reward Points</h2>
                <button onClick={() => setShowRedeem(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Convert points to wallet credit at <span className="font-medium text-foreground">1 point = ₹1</span>. You have{" "}
                <span className="font-semibold text-amber-400">{wallet.rewardPoints} points</span>.
              </p>
              <Input
                type="number"
                min={1}
                max={wallet.rewardPoints}
                value={redeemPoints}
                onChange={e => setRedeemPoints(e.target.value)}
                placeholder="Points to redeem"
                className="mb-3"
              />
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleRedeem} disabled={redeem.isPending}>
                {redeem.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redeeming…</> : `Redeem for ₹${Math.floor(Number(redeemPoints || 0)).toFixed(0)}`}
              </Button>
            </motion.div>
          )}

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
                      {isCredit ? "+" : "−"}₹{Math.abs(Number(t.amount)).toFixed(2)}
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
