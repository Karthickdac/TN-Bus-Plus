import { motion } from "framer-motion";
import { useState } from "react";
import { Tag, Copy, Check, Percent, BadgeIndianRupee, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOffers, type Offer } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function discountLabel(o: Offer): string {
  if (o.discountType === "percent") {
    return o.maxDiscount ? `${o.discountValue}% off · up to ₹${o.maxDiscount}` : `${o.discountValue}% off`;
  }
  return `Flat ₹${o.discountValue} off`;
}

export default function Offers() {
  const { data: offers, isLoading } = useListOffers();
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast({ title: "Code copied", description: `Apply ${code} at checkout.` });
      setTimeout(() => setCopied(c => (c === code ? null : c)), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: `Use code ${code} at checkout.`, variant: "destructive" });
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Offers & Promo Codes</h1>
      <p className="text-muted-foreground mb-6">
        Save more on every trip. Copy a code and apply it at checkout — discounts are validated automatically.
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (offers ?? []).length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl px-5 py-10 text-center text-muted-foreground text-sm">
          No offers are running right now. Check back soon.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(offers ?? []).map((o, i) => (
            <motion.div
              key={o.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden flex flex-col bg-gradient-to-br from-indigo-500/10 via-card to-orange-500/10 border border-border/50 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 px-2 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" /> {o.category}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {o.discountType === "percent" ? <Percent className="w-4 h-4" /> : <BadgeIndianRupee className="w-4 h-4" />}
                  {discountLabel(o)}
                </span>
              </div>

              <h2 className="font-semibold mb-1">{o.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{o.description}</p>

              <div className="mt-auto flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => copyCode(o.code)}
                  className="group inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-sm font-mono font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {o.code}
                  {copied === o.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />}
                </button>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Min fare ₹{o.minFare}</p>
                  <p>Till {fmtDate(o.validUntil)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
