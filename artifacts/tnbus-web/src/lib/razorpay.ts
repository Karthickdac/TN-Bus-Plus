// Thin wrapper around Razorpay Checkout. The script is loaded on demand (so it
// is not pulled in on pages that never take a payment) and the modal stays
// in-app, returning the signed payment proof that the backend verifies.

declare global {
  interface Window {
    // Razorpay's checkout.js attaches a constructor to window.
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (resp: unknown) => void) => void };
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class PaymentCancelledError extends Error {
  constructor() {
    super("Payment cancelled. You have not been charged.");
    this.name = "PaymentCancelledError";
  }
}

interface OpenCheckoutArgs {
  keyId: string;
  orderId: string;
  amount: number; // rupees
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; contact?: string; email?: string };
}

// Opens the Razorpay modal and resolves with the signed success payload, or
// rejects with PaymentCancelledError if the user closes the modal, or a generic
// Error if the payment itself fails.
export function openRazorpayCheckout(args: OpenCheckoutArgs): Promise<RazorpaySuccess> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Payment gateway is not available. Please try again."));
      return;
    }
    let settled = false;
    const rzp = new window.Razorpay({
      key: args.keyId,
      order_id: args.orderId,
      amount: Math.round(args.amount * 100),
      currency: args.currency,
      name: args.name,
      description: args.description,
      prefill: args.prefill ?? {},
      theme: { color: "#4f46e5" },
      handler: (response: unknown) => {
        settled = true;
        resolve(response as RazorpaySuccess);
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new PaymentCancelledError());
        },
      },
    });
    rzp.on("payment.failed", (resp: unknown) => {
      settled = true;
      const desc = (resp as { error?: { description?: string } })?.error?.description;
      reject(new Error(desc || "Payment failed. You have not been charged."));
    });
    rzp.open();
  });
}
