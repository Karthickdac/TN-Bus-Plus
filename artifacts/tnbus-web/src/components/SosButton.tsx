import { useState } from "react";
import { motion } from "framer-motion";
import { Siren, Phone, MapPin, Share2, ShieldCheck, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface TripLocationContext {
  busNumber?: string;
  origin?: string;
  destination?: string;
  latitude?: number;
  longitude?: number;
  nextStop?: string | null;
  speed?: number;
}

const HELPLINES = [
  { label: "Emergency (Police/Fire/Medical)", number: "112", tone: "text-red-400" },
  { label: "Women Helpline", number: "1091", tone: "text-rose-400" },
  { label: "Ambulance", number: "108", tone: "text-emerald-400" },
  { label: "Child Helpline", number: "1098", tone: "text-amber-400" },
  { label: "TN Transport Helpline", number: "9445014448", tone: "text-sky-400" },
];

function locationText(ctx?: TripLocationContext): string {
  if (!ctx) return "";
  const lines: string[] = ["🚨 TN Bus+ SOS — I need help on my journey."];
  if (ctx.busNumber) lines.push(`Bus: ${ctx.busNumber}`);
  if (ctx.origin && ctx.destination) lines.push(`Route: ${ctx.origin} → ${ctx.destination}`);
  if (ctx.nextStop) lines.push(`Approaching: ${ctx.nextStop}`);
  if (typeof ctx.latitude === "number" && typeof ctx.longitude === "number") {
    lines.push(`Location: ${ctx.latitude.toFixed(4)}, ${ctx.longitude.toFixed(4)}`);
    lines.push(`Map: https://maps.google.com/?q=${ctx.latitude},${ctx.longitude}`);
  }
  return lines.join("\n");
}

export default function SosButton({
  context,
  className = "",
}: {
  context?: TripLocationContext;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasCoords =
    !!context && typeof context.latitude === "number" && typeof context.longitude === "number";

  const shareLocation = async () => {
    const text = locationText(context);
    try {
      if (navigator.share) {
        await navigator.share({ title: "TN Bus+ SOS", text });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.92 }}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 shadow-lg shadow-red-900/40 ${className}`}
        aria-label="Emergency SOS"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <Siren className="w-5 h-5" />
        SOS
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Siren className="w-5 h-5" /> Emergency & Safety
            </DialogTitle>
            <DialogDescription>
              Tap a number to call instantly. In a real emergency, always dial 112 first.
            </DialogDescription>
          </DialogHeader>

          {context && (
            <div className="rounded-xl border border-border/50 bg-background/50 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <MapPin className="w-3.5 h-3.5" /> Your trip context
              </p>
              {context.busNumber && <p className="font-medium">Bus {context.busNumber}</p>}
              {context.origin && context.destination && (
                <p className="text-muted-foreground">
                  {context.origin} → {context.destination}
                </p>
              )}
              {context.nextStop && (
                <p className="text-muted-foreground">Approaching {context.nextStop}</p>
              )}
              {hasCoords && (
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {context.latitude!.toFixed(4)}, {context.longitude!.toFixed(4)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {HELPLINES.map(h => (
              <a
                key={h.number}
                href={`tel:${h.number}`}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card hover:bg-primary/5 px-4 py-3 transition-colors"
              >
                <span className="text-sm font-medium">{h.label}</span>
                <span className={`flex items-center gap-1.5 font-bold ${h.tone}`}>
                  <Phone className="w-4 h-4" /> {h.number}
                </span>
              </a>
            ))}
          </div>

          {context && (
            <Button
              variant="outline"
              className="w-full"
              onClick={shareLocation}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-emerald-400" /> Trip details copied
                </>
              ) : (
                <>
                  {typeof navigator !== "undefined" && "share" in navigator ? (
                    <Share2 className="w-4 h-4 mr-2" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Share my live location & trip
                </>
              )}
            </Button>
          )}

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200/90 flex gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p>
              Women travellers: front-row women-only seats, CCTV-monitored buses and GPS tracking are
              active. Conductors are trained to assist — alert them or call 1091 anytime.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
