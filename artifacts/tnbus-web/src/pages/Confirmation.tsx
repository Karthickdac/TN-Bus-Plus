import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle,
  ChevronRight,
  Home,
  Ticket,
  XCircle,
  MapPin,
  Armchair,
  Bus,
  User,
  Users,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBooking, getGetBookingQueryKey } from "@workspace/api-client-react";
import TicketQR from "@/components/TicketQR";
import SosButton from "@/components/SosButton";

interface Props {
  params: { id: string };
}

export default function Confirmation({ params }: Props) {
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();

  const { data: booking, isLoading, error } = useGetBooking(id, {
    query: { enabled: !!id, queryKey: getGetBookingQueryKey(id) },
  });

  const fmtDt = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  if (isLoading)
    return (
      <div className="container mx-auto px-4 py-10 max-w-xl space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );

  if (error || !booking)
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-card border border-red-500/30 rounded-3xl p-10 text-center max-w-md w-full">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Booking not found</h2>
          <p className="text-muted-foreground mb-6">We couldn't load this ticket. Please check My Trips.</p>
          <Button className="bg-primary" onClick={() => setLocation("/dashboard/trips")}>
            Go to My Trips
          </Button>
        </div>
      </div>
    );

  const isConfirmed = booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      {/* Status banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        {isConfirmed ? (
          <>
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-9 h-9 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Booking Confirmed</h1>
            <p className="text-muted-foreground">Your e-ticket is ready — show the QR when boarding</p>
          </>
        ) : isCancelled ? (
          <>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-9 h-9 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">Booking Cancelled</h1>
            <p className="text-muted-foreground">This ticket has been cancelled and is no longer valid for travel</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-9 h-9 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Trip Completed</h1>
            <p className="text-muted-foreground">This journey is complete — thanks for travelling with TN Bus+</p>
          </>
        )}
      </motion.div>

      {/* E-ticket card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-border/50 rounded-3xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-5 border-b border-border/50 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">PNR Number</p>
            <p className="text-2xl font-mono font-bold tracking-widest text-primary">{booking.pnr}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-bold text-primary">₹{booking.totalFare}</p>
          </div>
        </div>

        {/* QR — only a confirmed booking has a valid boarding pass */}
        {isConfirmed && (
          <div className="flex flex-col items-center py-6 border-b border-dashed border-border/60">
            <TicketQR booking={booking} size={168} />
            <p className="text-xs text-muted-foreground mt-3">Scan to verify this e-ticket</p>
          </div>
        )}

        {/* Loyalty: show the AUTHORITATIVE award the server credited (derived
            from the trusted schedule fare), not a client-side re-derivation. */}
        {isConfirmed && (booking.rewardPointsEarned ?? 0) > 0 && (
          <div className="mx-5 mt-5 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
            <p className="text-sm">
              You earned{" "}
              <span className="font-semibold text-amber-400">
                {booking.rewardPointsEarned} reward points
              </span>{" "}
              — redeem them in your wallet.
            </p>
          </div>
        )}

        {/* Journey details */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-semibold">{booking.origin}</p>
              <p className="text-sm text-muted-foreground">{fmtDt(booking.departureTime)}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 text-right">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-semibold">{booking.destination}</p>
              <p className="text-sm text-muted-foreground">{fmtDt(booking.arrivalTime)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Detail icon={Bus} label="Bus" value={booking.busNumber ?? "—"} />
            <Detail icon={Armchair} label="Seats" value={booking.seatNumbers?.join(", ") || "—"} />
            <Detail icon={User} label="Passenger" value={booking.passengerName} />
            <Detail icon={MapPin} label="Status" value={booking.status} />
          </div>

          {/* Group/family booking: every named traveller under this PNR */}
          {(booking.coPassengers?.length ?? 0) > 0 && (
            <div className="pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" /> Passengers ({booking.coPassengers!.length})
              </div>
              <div className="space-y-2">
                {booking.coPassengers!.map(pax => (
                  <div key={pax.seatNumber} className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium">{pax.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      Seat {pax.seatNumber} · {pax.gender}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1 h-12" onClick={() => setLocation("/dashboard/trips")}>
          <Ticket className="w-4 h-4 mr-2" /> My Trips
        </Button>
        <Button className="flex-1 h-12 bg-primary" onClick={() => setLocation("/")}>
          <Home className="w-4 h-4 mr-2" /> Home
        </Button>
      </div>

      {/* Emergency SOS is available while the trip is still upcoming/active. */}
      {isConfirmed && (
        <SosButton
          context={{
            busNumber: booking.busNumber,
            origin: booking.origin,
            destination: booking.destination,
          }}
        />
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bus;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background/50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}
