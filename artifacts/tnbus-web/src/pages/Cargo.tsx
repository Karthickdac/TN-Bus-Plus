import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Search, Loader2, MapPin, Phone, User, Weight, CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateCargoBooking,
  useTrackCargoBooking,
  getTrackCargoBookingQueryKey,
  type CargoInputParcelType,
  type CargoBooking,
} from "@workspace/api-client-react";

const PARCEL_TYPES: { value: CargoInputParcelType; label: string }[] = [
  { value: "document", label: "Document" },
  { value: "package", label: "Package" },
  { value: "fragile", label: "Fragile" },
  { value: "electronics", label: "Electronics" },
  { value: "other", label: "Other" },
];

function apiError(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: string } } | undefined)?.data;
  return data?.error ?? fallback;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Cargo() {
  const { toast } = useToast();
  const createCargo = useCreateCargoBooking();

  const [form, setForm] = useState({
    senderName: "", senderPhone: "", receiverName: "", receiverPhone: "",
    origin: "", destination: "", parcelType: "package" as CargoInputParcelType,
    weightKg: "1", description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [booked, setBooked] = useState<CargoBooking | null>(null);
  const [copied, setCopied] = useState(false);

  const [trackId, setTrackId] = useState("");
  const [trackQuery, setTrackQuery] = useState("");
  const { data: tracked, isLoading: tracking, isError: trackError } = useTrackCargoBooking(trackQuery, {
    query: { enabled: trackQuery.length > 0, queryKey: getTrackCargoBookingQueryKey(trackQuery) },
  });

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const validate = (): string | null => {
    if (!form.senderName.trim() || !form.receiverName.trim()) return "Enter both sender and receiver names.";
    if (!/^\d{10}$/.test(form.senderPhone.trim()) || !/^\d{10}$/.test(form.receiverPhone.trim()))
      return "Enter valid 10-digit phone numbers for sender and receiver.";
    if (!form.origin.trim() || !form.destination.trim()) return "Enter origin and destination cities.";
    if (form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase())
      return "Origin and destination must be different.";
    const w = parseFloat(form.weightKg);
    if (!(w > 0)) return "Enter a parcel weight greater than 0 kg.";
    return null;
  };

  const handleBook = async () => {
    const v = validate();
    if (v) { setFormError(v); return; }
    setFormError(null);
    try {
      const result = await createCargo.mutateAsync({
        data: {
          senderName: form.senderName.trim(),
          senderPhone: form.senderPhone.trim(),
          receiverName: form.receiverName.trim(),
          receiverPhone: form.receiverPhone.trim(),
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          parcelType: form.parcelType,
          weightKg: parseFloat(form.weightKg),
          description: form.description.trim() || undefined,
        },
      });
      setBooked(result);
      toast({ title: "Parcel booked", description: `Tracking ID ${result.trackingId}` });
    } catch (err) {
      setFormError(apiError(err, "Could not book the parcel. Please try again."));
    }
  };

  const copyTracking = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setBooked(null);
    setForm({
      senderName: "", senderPhone: "", receiverName: "", receiverPhone: "",
      origin: "", destination: "", parcelType: "package", weightKg: "1", description: "",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Cargo & Parcel</h1>
      <p className="text-muted-foreground mb-6">
        Send parcels across Tamil Nadu on TNSTC buses. Book a consignment and track it with the ID.
      </p>

      {/* Track section */}
      <section className="mb-8 bg-card border border-border/50 rounded-2xl p-5">
        <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" /> Track a parcel
        </h2>
        <div className="flex gap-2">
          <Input
            value={trackId}
            onChange={e => setTrackId(e.target.value.toUpperCase())}
            placeholder="Enter tracking ID (e.g. CGO…)"
            className="font-mono"
          />
          <Button onClick={() => setTrackQuery(trackId.trim())} disabled={!trackId.trim()}>
            Track
          </Button>
        </div>
        {trackQuery && tracking && (
          <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Looking up {trackQuery}…
          </p>
        )}
        {trackQuery && trackError && (
          <p className="text-sm text-red-500 mt-3">No parcel found for that tracking ID.</p>
        )}
        {tracked && (
          <div className="mt-4 rounded-xl border border-border/50 bg-background/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-primary">{tracked.trackingId}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">
                {tracked.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{tracked.origin} → {tracked.destination} · {tracked.parcelType} · {tracked.weightKg} kg</p>
            <p className="text-sm">Estimated delivery: <span className="font-medium">{fmtDate(tracked.estimatedDelivery)}</span></p>
            <p className="text-sm">Charge paid: <span className="font-medium">₹{tracked.charge}</span></p>
          </div>
        )}
      </section>

      {/* Book section */}
      {booked ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-emerald-500/30 rounded-2xl p-6 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Parcel booked!</h2>
          <p className="text-muted-foreground mb-4">{booked.origin} → {booked.destination}</p>
          <button
            type="button"
            onClick={() => copyTracking(booked.trackingId)}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-4 py-2 font-mono font-semibold text-primary hover:bg-primary/10 transition-colors mb-4"
          >
            {booked.trackingId}
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 opacity-60" />}
          </button>
          <div className="grid grid-cols-2 gap-3 text-sm text-left max-w-sm mx-auto mb-5">
            <div className="rounded-lg bg-background/40 border border-border/40 p-3">
              <p className="text-xs text-muted-foreground">Charge</p>
              <p className="font-semibold">₹{booked.charge}</p>
            </div>
            <div className="rounded-lg bg-background/40 border border-border/40 p-3">
              <p className="text-xs text-muted-foreground">Est. delivery</p>
              <p className="font-semibold">{fmtDate(booked.estimatedDelivery)}</p>
            </div>
          </div>
          <Button variant="outline" onClick={resetForm}>Book another parcel</Button>
        </motion.div>
      ) : (
        <section className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" /> Book a parcel
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Sender name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.senderName} onChange={e => set({ senderName: e.target.value })} className="pl-9" placeholder="Full name" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Sender phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.senderPhone} onChange={e => set({ senderPhone: e.target.value })} className="pl-9" placeholder="10-digit number" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Receiver name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.receiverName} onChange={e => set({ receiverName: e.target.value })} className="pl-9" placeholder="Full name" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Receiver phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.receiverPhone} onChange={e => set({ receiverPhone: e.target.value })} className="pl-9" placeholder="10-digit number" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.origin} onChange={e => set({ origin: e.target.value })} className="pl-9" placeholder="Origin city" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.destination} onChange={e => set({ destination: e.target.value })} className="pl-9" placeholder="Destination city" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Weight (kg)</label>
              <div className="relative">
                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" min="0.5" step="0.5" value={form.weightKg} onChange={e => set({ weightKg: e.target.value })} className="pl-9" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Parcel type</label>
              <select
                value={form.parcelType}
                onChange={e => set({ parcelType: e.target.value as CargoInputParcelType })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {PARCEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Description (optional)</label>
            <Input value={form.description} onChange={e => set({ description: e.target.value })} placeholder="What's inside?" />
          </div>

          <div className="rounded-xl bg-muted/40 border border-border/40 p-3 text-xs text-muted-foreground">
            Charges are calculated on weight and parcel type at booking. Fragile and electronics carry a careful-handling surcharge.
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <Button className="w-full bg-primary hover:bg-primary/90 h-12" onClick={handleBook} disabled={createCargo.isPending}>
            {createCargo.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…</>
            ) : "Book parcel"}
          </Button>
        </section>
      )}
    </div>
  );
}
