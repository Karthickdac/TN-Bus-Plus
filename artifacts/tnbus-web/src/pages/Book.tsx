import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Phone, User, Loader2, XCircle, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateBooking, useCreateBookingOrder, useVerifyPayment } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadRazorpay, openRazorpayCheckout, PaymentCancelledError } from "@/lib/razorpay";

type Step = "details" | "payment" | "processing" | "failed";

const PAYMENT_METHODS = [
  { label: "UPI", icon: "₹", desc: "GPay, PhonePe, Paytm" },
  { label: "Net Banking", icon: "🏦", desc: "All major banks" },
  { label: "Credit Card", icon: "💳", desc: "Visa, Mastercard" },
  { label: "Wallet", icon: "👛", desc: "TN Bus+ wallet" },
];

export default function Book() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();
  const p = new URLSearchParams(search);
  const scheduleId = parseInt(p.get("scheduleId") ?? "1");
  const seats = (p.get("seats") ?? "").split(",").filter(Boolean);
  const fare = parseFloat(p.get("fare") ?? "0");

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [method, setMethod] = useState("UPI");
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);

  const createBooking = useCreateBooking();
  const createBookingOrder = useCreateBookingOrder();
  const verifyPayment = useVerifyPayment();

  const apiError = (err: unknown, fallback: string): string => {
    const data = (err as { data?: { error?: string } } | undefined)?.data;
    return data?.error ?? fallback;
  };

  const handleConfirm = async () => {
    if (step === "details") {
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

    // Wallet payments settle internally against the passenger's stored balance.
    if (method.toLowerCase().includes("wallet")) {
      setStep("processing");
      try {
        const result = await createBooking.mutateAsync({
          data: {
            passengerId: user.id,
            scheduleId,
            seatNumbers: seats,
            passengerName: name,
            passengerPhone: phone,
            totalFare: fare,
            paymentMethod: "wallet",
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
          passengerName: name,
          passengerPhone: phone,
          totalFare: fare,
          paymentMethod: method,
        },
      });

      const success = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.name ?? "TN Bus+",
        description: order.description ?? `Seats ${seats.join(", ")}`,
        prefill: { name, contact: phone },
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
            <p className="text-2xl font-bold text-primary">₹{fare.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {seats.length} seat{seats.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

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
          className="bg-card border border-border/50 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-semibold text-lg mb-2">Passenger Information</h2>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={name} onChange={e => setName(e.target.value)} className="pl-9" placeholder="Full name" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" placeholder="10-digit number" />
            </div>
          </div>
        </motion.div>
      )}

      {step === "payment" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-6 space-y-4"
        >
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
          {step === "details" ? "Continue to Payment" : `Pay ₹${fare.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
