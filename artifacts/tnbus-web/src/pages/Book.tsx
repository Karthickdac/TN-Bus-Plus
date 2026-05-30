import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Phone, User, Loader2, XCircle, ShieldCheck, Star, Users, Tag, Check, Umbrella, UtensilsCrossed, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateBooking, useCreateBookingOrder, useVerifyPayment,
  useGetSeats, getGetSeatsQueryKey,
  useListAddOns, useValidateOffer,
} from "@workspace/api-client-react";
import type { CoPassenger, CoPassengerGender, AddOnSelection, AddOnItem } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadRazorpay, openRazorpayCheckout, PaymentCancelledError } from "@/lib/razorpay";
import SafetyPanel from "@/components/SafetyPanel";

type Step = "details" | "payment" | "processing" | "failed";

const PAYMENT_METHODS = [
  { label: "UPI", icon: "₹", desc: "GPay, PhonePe, Paytm" },
  { label: "Net Banking", icon: "🏦", desc: "All major banks" },
  { label: "Credit Card", icon: "💳", desc: "Visa, Mastercard" },
  { label: "Wallet", icon: "👛", desc: "TN Bus+ wallet" },
];

const GENDERS: { value: CoPassengerGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export default function Book() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const p = new URLSearchParams(search);
  const scheduleId = parseInt(p.get("scheduleId") ?? "1");
  const seats = (p.get("seats") ?? "").split(",").filter(Boolean);
  const fare = parseFloat(p.get("fare") ?? "0");

  // One traveller per selected seat (group/family booking). The first traveller
  // is the lead/contact passenger; their name + the phone below become the
  // booking's primary contact.
  const [passengers, setPassengers] = useState<CoPassenger[]>(
    () => seats.map((sn, i) => ({
      seatNumber: sn,
      name: i === 0 ? (user?.name ?? "") : "",
      gender: "female" as CoPassengerGender,
    })),
  );
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [method, setMethod] = useState("UPI");
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Offers + add-ons. The promo discount and add-on prices are confirmed
  // server-side at booking; the figures here are for display only.
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});

  const createBooking = useCreateBooking();
  const createBookingOrder = useCreateBookingOrder();
  const verifyPayment = useVerifyPayment();
  const validateOffer = useValidateOffer();
  const { data: addOnCatalogue } = useListAddOns();

  const allAddOns: AddOnItem[] = [
    ...(addOnCatalogue?.insurance ?? []),
    ...(addOnCatalogue?.food ?? []),
  ];
  const addOnsTotal = allAddOns.reduce((sum, item) => sum + item.price * (qty[item.id] ?? 0), 0);
  const discount = appliedPromo?.discountAmount ?? 0;
  const finalTotal = Math.max(0, fare - discount + addOnsTotal);
  const addOnSelections: AddOnSelection[] = allAddOns
    .filter(item => (qty[item.id] ?? 0) > 0)
    .map(item => ({ id: item.id, qty: qty[item.id] ?? 0 }));

  const setQtyFor = (id: string, next: number) =>
    setQty(prev => ({ ...prev, [id]: Math.max(0, next) }));

  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await validateOffer.mutateAsync({ data: { code, fare } });
      if (res.valid) {
        setAppliedPromo({ code: res.code ?? code, discountAmount: res.discountAmount });
        setPromoError(null);
      } else {
        setAppliedPromo(null);
        setPromoError(res.message);
      }
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(apiError(err, "Couldn't validate this code. Please try again."));
    }
  };

  const clearPromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // Seat metadata tells us which selected seats are women-only so we can enforce
  // a female traveller on those seats (the server enforces this authoritatively).
  const { data: seatData } = useGetSeats(scheduleId, {
    query: { enabled: !!scheduleId, queryKey: getGetSeatsQueryKey(scheduleId) },
  });
  const isWomenOnly = (sn: string) => seatData?.find(s => s.seatNumber === sn)?.isWomenOnly ?? false;

  // When seat data loads, force women-only seats to a female traveller.
  useEffect(() => {
    if (!seatData) return;
    setPassengers(prev =>
      prev.map(pax => (isWomenOnly(pax.seatNumber) ? { ...pax, gender: "female" } : pax)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatData]);

  const updatePassenger = (seatNumber: string, patch: Partial<CoPassenger>) => {
    setPassengers(prev => prev.map(pax => (pax.seatNumber === seatNumber ? { ...pax, ...patch } : pax)));
  };

  const leadName = passengers[0]?.name ?? "";

  const validateDetails = (): string | null => {
    for (const pax of passengers) {
      if (!pax.name.trim()) return "Please enter a name for every passenger.";
      if (isWomenOnly(pax.seatNumber) && pax.gender !== "female") {
        return `Seat ${pax.seatNumber} is women-only — assign a female traveller or pick another seat.`;
      }
    }
    if (!/^\d{10}$/.test(phone.trim())) return "Enter a valid 10-digit contact number.";
    return null;
  };

  const apiError = (err: unknown, fallback: string): string => {
    const data = (err as { data?: { error?: string } } | undefined)?.data;
    return data?.error ?? fallback;
  };

  const handleConfirm = async () => {
    if (step === "details") {
      const v = validateDetails();
      if (v) { setValidationError(v); return; }
      setValidationError(null);
      setStep("payment");
      return;
    }
    // Loyalty and wallet actions are tied to the signed-in account, so a
    // booking must be made by a logged-in passenger.
    if (!user) {
      setLocation("/login");
      return;
    }
    setError(null);

    const coPassengers = passengers.map(pax => ({
      seatNumber: pax.seatNumber,
      name: pax.name.trim(),
      gender: pax.gender,
    }));

    // Wallet payments settle internally against the passenger's stored balance.
    if (method.toLowerCase().includes("wallet")) {
      setStep("processing");
      try {
        const result = await createBooking.mutateAsync({
          data: {
            passengerId: user.id,
            scheduleId,
            seatNumbers: seats,
            passengerName: leadName,
            passengerPhone: phone,
            totalFare: fare,
            paymentMethod: "wallet",
            coPassengers,
            promoCode: appliedPromo?.code,
            addOns: addOnSelections,
          },
        });
        setTimeout(() => setLocation(`/booking/${result.id}`), 600);
      } catch (err) {
        setError(apiError(err, "Your payment couldn't be completed and you have not been charged. Please try again."));
        setStep("failed");
      }
      return;
    }

    // External payments go through Razorpay. We create a pending booking + order
    // server-side, open the secure checkout, then verify the signed result. If
    // the modal is dismissed or fails, the booking stays unconfirmed and no seat
    // is held — and the passenger is not charged.
    setStep("processing");
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Could not load the payment gateway. Please try again.");

      const order = await createBookingOrder.mutateAsync({
        data: {
          passengerId: user.id,
          scheduleId,
          seatNumbers: seats,
          passengerName: leadName,
          passengerPhone: phone,
          totalFare: fare,
          paymentMethod: method,
          coPassengers,
          promoCode: appliedPromo?.code,
          addOns: addOnSelections,
        },
      });

      const success = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.name ?? "TN Bus+",
        description: order.description ?? `Seats ${seats.join(", ")}`,
        prefill: { name: leadName, contact: phone },
      });

      await verifyPayment.mutateAsync({
        data: {
          razorpayOrderId: success.razorpay_order_id,
          razorpayPaymentId: success.razorpay_payment_id,
          razorpaySignature: success.razorpay_signature,
        },
      });

      setTimeout(() => setLocation(`/booking/${order.bookingId}`), 400);
    } catch (err) {
      if (err instanceof PaymentCancelledError) {
        setError(err.message);
      } else if (err instanceof Error && !(err as { data?: unknown }).data) {
        setError(err.message);
      } else {
        setError(apiError(err, "Your payment couldn't be completed and you have not been charged. Please try again."));
      }
      setStep("failed");
    }
  };

  if (step === "processing")
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-1">Processing payment…</h2>
          <p className="text-muted-foreground">Securing your seats — please don't close this window.</p>
        </motion.div>
      </div>
    );

  if (step === "failed")
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-red-500/30 rounded-3xl p-10 text-center max-w-md w-full"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-9 h-9 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Payment Failed</h2>
          <p className="text-muted-foreground mb-6">
            {error ?? "Your payment couldn't be completed and you have not been charged. Please try again."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setLocation("/")}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary" onClick={() => setStep("payment")}>
              Try Again
            </Button>
          </div>
        </motion.div>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {["Passenger Details", "Payment"].map((label, i) => {
          const isActive = (i === 0 && step === "details") || (i === 1 && step === "payment");
          const isDone = i === 0 && step === "payment";
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 1 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Summary card */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Schedule #{scheduleId}</span>
            </div>
            <p className="text-sm">
              Seats: <span className="font-semibold text-primary">{seats.join(", ")}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">₹{finalTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {seats.length} seat{seats.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Fare breakdown when a discount or add-on is in play */}
        {(discount > 0 || addOnsTotal > 0) && (
          <div className="mt-4 pt-4 border-t border-border/40 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Base fare</span>
              <span>₹{fare.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Promo {appliedPromo?.code}</span>
                <span>− ₹{discount.toFixed(2)}</span>
              </div>
            )}
            {addOnsTotal > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Add-ons</span>
                <span>+ ₹{addOnsTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t border-border/40">
              <span>Total</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Government subsidy + loyalty */}
        <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-muted-foreground">
              Government of Tamil Nadu subsidised fare — concession already applied.
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-muted-foreground">
              You'll earn <span className="font-semibold text-amber-400">{Math.floor(fare / 10)} reward points</span> on this booking.
            </span>
          </div>
        </div>
      </div>

      {step === "details" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {passengers.length > 1 ? `${passengers.length} Passengers` : "Passenger Information"}
              </h2>
              <span className="text-xs text-muted-foreground">One PNR for the whole group</span>
            </div>

            {passengers.map((pax, idx) => {
              const womenOnly = isWomenOnly(pax.seatNumber);
              return (
                <div key={pax.seatNumber} className="rounded-xl border border-border/50 bg-background/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Seat {pax.seatNumber}{idx === 0 && " · Lead passenger"}
                    </span>
                    {womenOnly && (
                      <span className="text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-full px-2 py-0.5">
                        Women only
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={pax.name}
                      onChange={e => updatePassenger(pax.seatNumber, { name: e.target.value })}
                      className="pl-9"
                      placeholder={idx === 0 ? "Lead passenger full name" : "Co-passenger full name"}
                    />
                  </div>
                  <div className="flex gap-2">
                    {GENDERS.map(g => {
                      const selected = pax.gender === g.value;
                      const disabled = womenOnly && g.value !== "female";
                      return (
                        <button
                          key={g.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => updatePassenger(pax.seatNumber, { gender: g.value })}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : disabled
                              ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                              : "border-border/60 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="space-y-1 pt-1">
              <label className="text-sm text-muted-foreground">Contact Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" placeholder="10-digit number" />
              </div>
              <p className="text-xs text-muted-foreground">Ticket and trip updates are sent to this number.</p>
            </div>

            {validationError && (
              <p className="text-sm text-red-400">{validationError}</p>
            )}
          </div>

          <SafetyPanel />
        </motion.div>
      )}

      {step === "payment" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Promo code */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-500" /> Promo code
            </h2>
            {appliedPromo ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono font-semibold">{appliedPromo.code}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">− ₹{appliedPromo.discountAmount.toFixed(2)}</span>
                </div>
                <button type="button" onClick={clearPromo} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. WELCOME10)"
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={handleApplyPromo} disabled={!promoInput.trim() || validateOffer.isPending}>
                    {validateOffer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
                {promoError && <p className="text-sm text-red-500">{promoError}</p>}
                <p className="text-xs text-muted-foreground">
                  Browse current codes on the <button type="button" onClick={() => setLocation("/offers")} className="text-primary underline">Offers</button> page.
                </p>
              </>
            )}
          </div>

          {/* Add-ons */}
          {allAddOns.length > 0 && (
            <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-lg">Add-ons</h2>

              {(addOnCatalogue?.insurance ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Umbrella className="w-4 h-4 text-sky-500" /> Travel insurance
                  </p>
                  {(addOnCatalogue?.insurance ?? []).map(item => {
                    const on = (qty[item.id] ?? 0) > 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setQtyFor(item.id, on ? 0 : 1)}
                        className={`w-full text-left rounded-xl p-3 border transition-colors ${on ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border/60 hover:bg-primary/5"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.name}</span>
                          <span className="text-sm font-semibold">₹{item.price} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span></span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {(addOnCatalogue?.food ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <UtensilsCrossed className="w-4 h-4 text-orange-500" /> Food pre-order
                  </p>
                  {(addOnCatalogue?.food ?? []).map(item => {
                    const count = qty[item.id] ?? 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-xl p-3 border border-border/60">
                        <div className="min-w-0 pr-3">
                          <div className="font-medium text-sm">{item.name}</div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                          <p className="text-xs font-semibold mt-0.5">₹{item.price} <span className="font-normal text-muted-foreground">{item.unit}</span></p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setQtyFor(item.id, count - 1)}
                            disabled={count === 0}
                            className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center disabled:opacity-40 hover:bg-primary/5"
                            aria-label={`Remove one ${item.name}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{count}</span>
                          <button
                            type="button"
                            onClick={() => setQtyFor(item.id, count + 1)}
                            className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-primary/5"
                            aria-label={`Add one ${item.name}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-2">Payment</h2>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map(opt => {
              const selected = method === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setMethod(opt.label)}
                  className={`text-left rounded-xl p-3 border transition-colors ${selected ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border/60 hover:bg-primary/5"}`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {opt.label === "Wallet" && user
                      ? `Balance ₹${Number(user.walletBalance).toFixed(2)}`
                      : opt.desc}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">
            {method.toLowerCase().includes("wallet")
              ? "Paid instantly from your TN Bus+ wallet balance."
              : "Secure payment by Razorpay · 256-bit SSL encryption"}
          </p>
          </div>
        </motion.div>
      )}

      <div className="mt-6 flex gap-3">
        {step === "payment" && (
          <Button variant="outline" onClick={() => setStep("details")}>
            Back
          </Button>
        )}
        <Button
          className="flex-1 bg-primary hover:bg-primary/90 h-12"
          onClick={handleConfirm}
          disabled={createBooking.isPending}
        >
          {step === "details" ? "Continue to Payment" : `Pay ₹${finalTotal.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
