import { useState, useMemo } from "react";
import {
  useSearchBuses,
  useGetSeats,
  useCreateBooking,
  getSearchBusesQueryKey,
  getGetSeatsQueryKey,
} from "@workspace/api-client-react";
import type { SearchResult, Seat, Booking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bus,
  Clock,
  IndianRupee,
  Armchair,
  User,
  Phone,
  Banknote,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Printer,
  RotateCcw,
  ArrowRight,
  Loader2,
} from "lucide-react";

const WALK_IN_PASSENGER_ID = 0;
type PaymentMethod = "Cash" | "Card" | "UPI";
type Step = 1 | 2 | 3 | 4;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STEPS = ["Trip", "Seats", "Passenger", "Receipt"];

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                active
                  ? "bg-indigo-600 text-white"
                  : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  active ? "bg-white/20" : done ? "bg-emerald-200" : "bg-slate-200"
                }`}
              >
                {n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPOS() {
  const [step, setStep] = useState<Step>(1);

  // Step 1: trip search
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [searchKey, setSearchKey] = useState<{ origin: string; destination: string; date: string } | null>(null);
  const searchParams = searchKey ?? { origin: "", destination: "", date: "" };
  const { data: trips, isLoading: tripsLoading } = useSearchBuses(searchParams, {
    query: { enabled: !!searchKey, queryKey: getSearchBusesQueryKey(searchParams) },
  });

  // Step 2: seats
  const [trip, setTrip] = useState<SearchResult | null>(null);
  const scheduleId = trip?.scheduleId ?? 0;
  const { data: seats, isLoading: seatsLoading } = useGetSeats(scheduleId, {
    query: { enabled: !!trip, queryKey: getGetSeatsQueryKey(scheduleId) },
  });
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Step 3: passenger + payment
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("Cash");

  // Step 4: result
  const [booking, setBooking] = useState<Booking | null>(null);
  const create = useCreateBooking();

  const seatPrice = (sn: string) => seats?.find(s => s.seatNumber === sn)?.price ?? trip?.fare ?? 0;
  const total = useMemo(
    () => selectedSeats.reduce((sum, sn) => sum + seatPrice(sn), 0),
    [selectedSeats, seats, trip],
  );

  const reset = () => {
    setStep(1);
    setOrigin("");
    setDestination("");
    setSearchKey(null);
    setTrip(null);
    setSelectedSeats([]);
    setName("");
    setPhone("");
    setPayment("Cash");
    setBooking(null);
    create.reset();
  };

  const toggleSeat = (s: Seat) => {
    if (!s.isAvailable) return;
    setSelectedSeats(prev =>
      prev.includes(s.seatNumber) ? prev.filter(x => x !== s.seatNumber) : [...prev, s.seatNumber],
    );
  };

  const confirm = async () => {
    if (!trip) return;
    const res = await create.mutateAsync({
      data: {
        passengerId: WALK_IN_PASSENGER_ID,
        scheduleId: trip.scheduleId,
        seatNumbers: selectedSeats,
        passengerName: name.trim(),
        passengerPhone: phone.trim(),
        totalFare: total,
      },
    });
    setBooking(res);
    setStep(4);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-1">
            <CreditCard className="w-3.5 h-3.5" /> Counter POS
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">POS Booking</h1>
          <p className="text-sm text-slate-500">Book tickets for walk-in passengers at the counter</p>
        </div>
        <Stepper step={step} />
      </div>

      {/* Step 1 — Trip search */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  From
                </label>
                <input
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  placeholder="Departure city"
                  className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                  To
                </label>
                <input
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="Arrival city"
                  className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <Button
              onClick={() => setSearchKey({ origin, destination, date: "" })}
              disabled={!origin.trim() || !destination.trim()}
              className="mt-4 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6"
            >
              <Search className="w-4 h-4 mr-2" /> Search buses
            </Button>
          </div>

          {tripsLoading && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching…
            </div>
          )}

          {searchKey && !tripsLoading && trips && trips.length === 0 && (
            <p className="text-center text-slate-400 py-10">No buses found for this route.</p>
          )}

          <div className="space-y-2.5">
            {trips?.map(t => (
              <button
                key={t.scheduleId}
                onClick={() => {
                  setTrip(t);
                  setSelectedSeats([]);
                  setStep(2);
                }}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-sm transition-all p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Bus className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{t.busType}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {fmtTime(t.departureTime)} – {fmtTime(t.arrivalTime)} ·{" "}
                      {t.availableSeats} seats
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-extrabold text-base text-slate-900 flex items-center">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {t.fare}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Seat selection */}
      {step === 2 && trip && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-slate-900">
              {trip.origin} → {trip.destination}
            </p>
            <p className="text-xs text-slate-500">
              {trip.busType} · {fmtTime(trip.departureTime)}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-100 border border-slate-300" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-indigo-600" /> Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-slate-200" /> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-pink-100 border border-pink-300" /> Women
              </span>
            </div>

            {seatsLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading seats…
              </div>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {seats?.map(s => {
                  const selected = selectedSeats.includes(s.seatNumber);
                  return (
                    <button
                      key={s.seatNumber}
                      onClick={() => toggleSeat(s)}
                      disabled={!s.isAvailable}
                      className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                        selected
                          ? "bg-indigo-600 text-white"
                          : !s.isAvailable
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : s.isWomenOnly
                              ? "bg-pink-100 text-pink-700 border border-pink-300 hover:bg-pink-200"
                              : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {s.seatNumber}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="h-11 rounded-xl">
              Back
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">{selectedSeats.length} seat(s)</p>
                <p className="font-extrabold text-slate-900 flex items-center justify-end">
                  <IndianRupee className="w-3.5 h-3.5" />
                  {total}
                </p>
              </div>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedSeats.length === 0}
                className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Passenger + payment */}
      {step === 3 && trip && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Passenger name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full h-11 rounded-xl border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Phone number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  inputMode="tel"
                  className="w-full h-11 rounded-xl border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Payment method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { m: "Cash" as const, icon: Banknote },
                    { m: "Card" as const, icon: CreditCard },
                    { m: "UPI" as const, icon: Smartphone },
                  ]
                ).map(({ m, icon: Icon }) => (
                  <button
                    key={m}
                    onClick={() => setPayment(m)}
                    className={`h-12 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                      payment === m
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                {trip.origin} → {trip.destination}
              </span>
              <span className="font-medium">{trip.busType}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 mt-1">
              <span>Seats</span>
              <span className="font-medium">{selectedSeats.join(", ")}</span>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-900">Total ({payment})</span>
              <span className="font-extrabold text-lg text-slate-900 flex items-center">
                <IndianRupee className="w-4 h-4" />
                {total}
              </span>
            </div>
          </div>

          {create.isError && (
            <p className="text-sm text-red-600">Booking failed. Please try again.</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="h-11 rounded-xl">
              Back
            </Button>
            <Button
              onClick={confirm}
              disabled={!name.trim() || phone.trim().length < 10 || create.isPending}
              className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6"
            >
              {create.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…
                </>
              ) : (
                <>Confirm & Pay</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — Receipt */}
      {step === 4 && booking && trip && (
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center print:shadow-none">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Booking Confirmed</h2>
            <p className="text-sm text-slate-500 mb-5">Ticket issued at counter</p>

            <div className="text-left border border-dashed border-slate-300 rounded-xl p-4 space-y-2 text-sm">
              <Row label="PNR" value={booking.pnr} bold />
              <Row label="Passenger" value={booking.passengerName ?? name} />
              <Row label="Phone" value={booking.passengerPhone ?? phone} />
              <Row label="Route" value={`${trip.origin} → ${trip.destination}`} />
              <Row label="Bus" value={`${trip.busType} · ${booking.busNumber ?? ""}`} />
              <Row label="Departs" value={fmtTime(booking.departureTime)} />
              <Row label="Seats" value={(booking.seatNumbers ?? selectedSeats).join(", ")} />
              <Row label="Payment" value={payment} />
              <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-slate-900">
                <span>Total Paid</span>
                <span className="flex items-center">
                  <IndianRupee className="w-3.5 h-3.5" />
                  {booking.totalFare ?? total}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 print:hidden">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex-1 h-11 rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button
              onClick={reset}
              className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> New booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={bold ? "font-extrabold text-slate-900" : "font-medium text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
