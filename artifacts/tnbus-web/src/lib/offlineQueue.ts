import type { ValidateTicketInput } from "@workspace/api-client-react";

// A scan captured while offline, waiting to be flushed to the server.
export interface QueuedScan {
  id: string;
  payload: ValidateTicketInput;
  label: string;
  queuedAt: string;
}

const KEY = "tnbus.conductor.validateQueue";

export function readQueue(): QueuedScan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedScan[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedScan[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueScan(payload: ValidateTicketInput, label: string): QueuedScan[] {
  const items = readQueue();
  const next: QueuedScan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    label,
    queuedAt: new Date().toISOString(),
  };
  const updated = [...items, next];
  writeQueue(updated);
  return updated;
}

export function removeScan(id: string): QueuedScan[] {
  const updated = readQueue().filter((s) => s.id !== id);
  writeQueue(updated);
  return updated;
}

export function clearQueue(): void {
  writeQueue([]);
}

// Turn a raw scanned string into a validate payload. QR codes carry a JSON
// envelope {t:"TNBUS",pnr,...}; anything else is treated as a raw PNR.
export function parseScanned(raw: string): { payload: ValidateTicketInput; label: string } {
  const trimmed = raw.trim();
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (obj && typeof obj === "object" && typeof obj.pnr === "string") {
      return { payload: { pnr: obj.pnr }, label: obj.pnr };
    }
  } catch {
    // not JSON — fall through
  }
  return { payload: { qr: trimmed }, label: trimmed.slice(0, 24) };
}
