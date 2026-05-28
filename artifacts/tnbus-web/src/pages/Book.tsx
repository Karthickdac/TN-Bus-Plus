import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { CreditCard, MapPin, Phone, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCreateBooking } from "@workspace/api-client-react";

export default function Book() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const p = new URLSearchParams(search);
  const scheduleId = parseInt(p.get("scheduleId") ?? "1");
  const seats = (p.get("seats") ?? "").split(",").filter(Boolean);
  const fare = parseFloat(p.get("fare") ?? "0");

  const [name, setName] = useState("Arun Kumar");
  const [phone, setPhone] = useState("9876543210");
  const [step, setStep] = useState<"details" | "payment" | "done">("details");
  const [pnr, setPnr] = useState("");

  const createBooking = useCreateBooking();

  const handleConfirm = async () => {
    if (step === "details") { setStep("payment"); return; }
    try {
      const result = await createBooking.mutateAsync({
        data: {
          passengerId: 1,
          scheduleId,
          seatNumbers: seats,
          passengerName: name,
          passengerPhone: phone,
          totalFare: fare,
        }
      });
      setPnr(result.pnr);
      setStep("done");
    } catch {
      alert("Booking failed. Please try again.");
    }
  };

  if (step === "done") return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-emerald-500/30 rounded-3xl p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Booking Confirmed</h2>
        <p className="text-muted-foreground mb-6">Your tickets have been booked successfully</p>
        <div className="bg-background/50 rounded-2xl p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-1">PNR Number</p>
          <p className="text-3xl font-mono font-bold text-primary tracking-widest">{pnr}</p>
        </div>
        <div className="text-sm text-muted-foreground mb-8">
          <p>Seats: {seats.join(", ")}</p>
          <p className="mt-1">Total paid: ₹{fare.toFixed(2)}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setLocation("/dashboard/trips")}>My Trips</Button>
          <Button className="flex-1 bg-primary" onClick={() => setLocation("/")}>Home</Button>
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
          const isDone = (i === 0 && step === "payment");
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {isDone ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
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
            <p className="text-sm">Seats: <span className="font-semibold text-primary">{seats.join(", ")}</span></p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">₹{fare.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{seats.length} seat{seats.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {step === "details" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-2">Payment</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "UPI", icon: "₹", desc: "GPay, PhonePe, Paytm" },
              { label: "Net Banking", icon: "🏦", desc: "All major banks" },
              { label: "Credit Card", icon: "💳", desc: "Visa, Mastercard" },
              { label: "Wallet", icon: "👛", desc: "TN Bus+ wallet" },
            ].map(opt => (
              <div key={opt.label} className="border border-primary/30 bg-primary/5 rounded-xl p-3 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="text-xl mb-1">{opt.icon}</div>
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">Payments are secured with 256-bit SSL encryption</p>
        </motion.div>
      )}

      <div className="mt-6 flex gap-3">
        {step === "payment" && (
          <Button variant="outline" onClick={() => setStep("details")}>Back</Button>
        )}
        <Button className="flex-1 bg-primary hover:bg-primary/90 h-12"
          onClick={handleConfirm}
          disabled={createBooking.isPending}>
          {createBooking.isPending ? "Processing..." : step === "details" ? "Continue to Payment" : `Pay ₹${fare.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
