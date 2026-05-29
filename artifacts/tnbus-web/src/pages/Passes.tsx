import { motion } from "framer-motion";
import { Ticket, GraduationCap, Bus, Check, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListPassProducts,
  useListPasses,
  usePurchasePass,
  getListPassesQueryKey,
  getGetWalletQueryKey,
  type PassProduct,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

function readApiError(err: unknown, fallback: string): string {
  const data = (err as { data?: unknown } | undefined)?.data;
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  return fallback;
}

export default function Passes() {
  const { user, refresh } = useAuth();
  const passengerId = user?.id ?? 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading: loadingProducts } = useListPassProducts();
  const { data: passes, isLoading: loadingPasses } = useListPasses(passengerId, {
    query: { enabled: passengerId > 0, queryKey: getListPassesQueryKey(passengerId) },
  });
  const purchase = usePurchasePass();

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const handleBuy = async (product: PassProduct) => {
    if (passengerId <= 0) return;
    try {
      await purchase.mutateAsync({ id: passengerId, data: { productId: product.id } });
      await queryClient.invalidateQueries({ queryKey: getListPassesQueryKey(passengerId) });
      await queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey(passengerId) });
      await refresh();
      toast({ title: "Pass activated", description: `${product.name} is now active.` });
    } catch (err) {
      const msg = readApiError(err, "Could not complete the purchase. Please try again.");
      toast({ title: "Purchase failed", description: msg, variant: "destructive" });
    }
  };

  const activePasses = (passes ?? []).filter(p => p.status === "active");
  const expiredPasses = (passes ?? []).filter(p => p.status !== "active");

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Travel Passes</h1>
      <p className="text-muted-foreground mb-6">
        Subsidised monthly and student passes — paid straight from your TN Bus+ wallet.
      </p>

      {/* My passes */}
      <section className="mb-10">
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" /> My Passes
        </h2>
        {loadingPasses ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : (passes ?? []).length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl px-5 py-10 text-center text-muted-foreground text-sm">
            You don't have any passes yet. Buy one below to start saving.
          </div>
        ) : (
          <div className="space-y-4">
            {activePasses.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {activePasses.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-primary/10 to-violet-500/10 border border-emerald-500/30 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {p.category === "student" ? (
                          <GraduationCap className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Bus className="w-5 h-5 text-emerald-400" />
                        )}
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Valid from</p>
                        <p className="font-medium">{fmtDate(p.validFrom)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Valid until</p>
                        <p className="font-medium">{fmtDate(p.validUntil)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {expiredPasses.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Expired</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {expiredPasses.map(p => (
                    <div
                      key={p.id}
                      className="bg-card border border-border/40 rounded-2xl p-5 opacity-60"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          Expired
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Expired {fmtDate(p.validUntil)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Buy a pass */}
      <section>
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Buy a Pass
        </h2>
        {loadingProducts ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(products ?? []).map((product, i) => {
              const isPending = purchase.isPending && purchase.variables?.data.productId === product.id;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {product.category === "student" ? (
                      <GraduationCap className="w-5 h-5 text-primary" />
                    ) : (
                      <Bus className="w-5 h-5 text-primary" />
                    )}
                    <span className="font-semibold">{product.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{product.description}</p>

                  <ul className="space-y-1.5 mb-4">
                    {product.benefits.map(b => (
                      <li key={b} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    {/* Subsidy display */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Base price</span>
                        <span className="line-through text-muted-foreground">₹{product.price.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Govt. subsidy
                        </span>
                        <span className="text-emerald-400">− ₹{product.subsidyAmount.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold mt-1 pt-1 border-t border-emerald-500/20">
                        <span>You pay</span>
                        <span className="text-lg">₹{product.netPrice.toFixed(0)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Valid for {product.durationDays} days
                    </p>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => handleBuy(product)}
                      disabled={purchase.isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                        </>
                      ) : (
                        `Buy for ₹${product.netPrice.toFixed(0)}`
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
