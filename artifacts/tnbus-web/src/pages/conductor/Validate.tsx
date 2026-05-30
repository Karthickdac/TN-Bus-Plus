import { useEffect, useState, useCallback, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, CameraOff, CheckCircle2, XCircle, AlertTriangle, Ban, WifiOff, CloudUpload, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useValidateTicket, type ValidationResult, type ValidateTicketInput } from "@workspace/api-client-react";
import {
  readQueue,
  enqueueScan,
  removeScan,
  parseScanned,
  type QueuedScan,
} from "@/lib/offlineQueue";

// An ApiError means the server actually responded (HTTP 4xx/5xx) — a definitive
// business/validation failure, not a connectivity problem. Anything else (a
// thrown TypeError from fetch) means we never reached the server.
function isNetworkError(err: unknown): boolean {
  return !(err != null && typeof err === "object" && (err as { name?: string }).name === "ApiError");
}

function errMessage(err: unknown): string {
  if (err != null && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "The server rejected this ticket.";
}

const RESULT_STYLES: Record<string, { icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  valid: { icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Valid ticket" },
  duplicate: { icon: AlertTriangle, bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Already validated" },
  cancelled: { icon: Ban, bg: "bg-rose-50 border-rose-200", text: "text-rose-700", label: "Cancelled booking" },
  not_found: { icon: XCircle, bg: "bg-rose-50 border-rose-200", text: "text-rose-700", label: "Not found" },
};

export default function Validate() {
  const { toast } = useToast();
  const [pnr, setPnr] = useState("");
  const [scanning, setScanning] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState<QueuedScan[]>(() => readQueue());
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);
  const [flushing, setFlushing] = useState(false);
  const flushingRef = useRef(false);

  const validate = useValidateTicket();

  const runValidate = useCallback(
    async (payload: ValidateTicketInput, label: string) => {
      if (!navigator.onLine) {
        setQueue(enqueueScan(payload, label));
        toast({ title: "Saved offline", description: `${label} queued — will sync when back online.` });
        return;
      }
      try {
        const res = await validate.mutateAsync({ data: payload });
        setLastResult(res);
        const style = RESULT_STYLES[res.result];
        toast({
          title: style?.label ?? res.result,
          description: res.message,
          variant: res.result === "valid" || res.result === "duplicate" ? "default" : "destructive",
        });
      } catch (err) {
        if (isNetworkError(err)) {
          // Connectivity dropped mid-request — keep the scan for later.
          setQueue(enqueueScan(payload, label));
          toast({ title: "Couldn't reach server", description: `${label} queued for later.`, variant: "destructive" });
        } else {
          // The server responded with an error (bad input, no bus, etc.) —
          // queuing would just fail again, so surface it instead.
          toast({ title: "Validation failed", description: errMessage(err), variant: "destructive" });
        }
      }
    },
    [validate, toast],
  );

  const flushQueue = useCallback(async () => {
    if (flushingRef.current || !navigator.onLine) return;
    const items = readQueue();
    if (items.length === 0) return;
    flushingRef.current = true;
    setFlushing(true);
    try {
      for (const item of items) {
        try {
          await validate.mutateAsync({ data: item.payload });
          setQueue(removeScan(item.id));
        } catch (err) {
          if (isNetworkError(err)) break; // connectivity lost — retry remaining later
          // Definitive server rejection — drop it so it can't block the queue.
          setQueue(removeScan(item.id));
        }
      }
    } finally {
      flushingRef.current = false;
      setFlushing(false);
    }
  }, [validate]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flushQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [flushQueue]);

  const handleManual = (e: React.FormEvent) => {
    e.preventDefault();
    const value = pnr.trim().toUpperCase();
    if (!value) return;
    void runValidate({ pnr: value }, value);
    setPnr("");
  };

  const resultStyle = lastResult ? RESULT_STYLES[lastResult.result] : null;
  const ResultIcon = resultStyle?.icon;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Conductor</p>
          <h1 className="text-2xl font-extrabold text-slate-900">Validate Ticket</h1>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            online ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {online ? <Camera className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {online ? "Online" : "Offline"}
        </span>
      </header>

      {/* Camera scanner */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        {scanning ? (
          <div className="relative">
            <Scanner
              onScan={(codes) => {
                const raw = codes[0]?.rawValue;
                if (!raw) return;
                setScanning(false);
                const { payload, label } = parseScanned(raw);
                void runValidate(payload, label);
              }}
              onError={() => toast({ title: "Camera error", description: "Couldn't access the camera.", variant: "destructive" })}
              styles={{ container: { width: "100%" } }}
            />
            <Button
              onClick={() => setScanning(false)}
              variant="secondary"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 gap-2"
            >
              <CameraOff className="w-4 h-4" /> Stop
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setScanning(true)}
            className="w-full p-8 flex flex-col items-center gap-3 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <span className="font-semibold text-slate-700">Scan ticket QR</span>
            <span className="text-xs text-slate-400">Point the camera at the passenger's QR code</span>
          </button>
        )}
      </div>

      {/* Manual entry */}
      <form onSubmit={handleManual} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
        <label className="text-sm font-semibold text-slate-700">Or enter PNR manually</label>
        <div className="flex gap-2">
          <Input
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            placeholder="e.g. TN8X2K4P"
            className="uppercase"
          />
          <Button type="submit" disabled={validate.isPending} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            {validate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
          </Button>
        </div>
      </form>

      {/* Last result */}
      {lastResult && resultStyle && ResultIcon && (
        <div className={`rounded-2xl border p-4 ${resultStyle.bg}`}>
          <div className={`flex items-center gap-2 font-bold ${resultStyle.text}`}>
            <ResultIcon className="w-5 h-5" /> {resultStyle.label}
          </div>
          <p className="text-sm text-slate-600 mt-1">{lastResult.message}</p>
          {lastResult.booking && (
            <div className="mt-3 text-sm text-slate-700 grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-slate-400">Passenger</span>
              <span className="font-medium text-right">{lastResult.booking.passengerName}</span>
              <span className="text-slate-400">Seats</span>
              <span className="font-medium text-right">{lastResult.booking.seatNumbers.join(", ")}</span>
              <span className="text-slate-400">Route</span>
              <span className="font-medium text-right">{lastResult.booking.origin} → {lastResult.booking.destination}</span>
            </div>
          )}
        </div>
      )}

      {/* Offline queue */}
      {queue.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <WifiOff className="w-4 h-4 text-amber-500" /> Pending sync ({queue.length})
            </div>
            <Button size="sm" variant="outline" onClick={() => void flushQueue()} disabled={!online || flushing} className="gap-1.5">
              {flushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
              Sync now
            </Button>
          </div>
          <ul className="space-y-2">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-mono text-slate-700">{q.label}</span>
                <button onClick={() => setQueue(removeScan(q.id))} className="text-slate-400 hover:text-rose-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
