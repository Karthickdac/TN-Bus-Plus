import Razorpay from "razorpay";
import { createHmac } from "node:crypto";

// Razorpay credentials are supplied by the user as Replit Secrets. There is no
// Replit connector for Razorpay, so we read the keys directly from the
// environment. The key id is also returned to the browser (it is a public
// identifier); the secret never leaves the server.
function getKeys(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  return { keyId, keySecret };
}

export function getRazorpayKeyId(): string {
  return getKeys().keyId;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret } = getKeys();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Verifies the signature Razorpay Checkout returns to the browser on a
// successful payment. The signature is HMAC-SHA256(order_id|payment_id) keyed
// with the secret, so a forged success callback cannot pass this check.
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getKeys();
  const expected = createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  // Constant-time compare on equal-length hex strings.
  if (expected.length !== input.signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ input.signature.charCodeAt(i);
  }
  return diff === 0;
}
