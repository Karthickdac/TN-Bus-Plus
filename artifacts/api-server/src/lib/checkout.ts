import type { BookingAddOn } from "@workspace/db";
import { computeDiscount } from "./offers";
import { resolveAddOns, type AddOnSelectionInput } from "./addons";

// Single source of truth for the money applied at checkout on top of a base
// fare. Discount and add-on totals are computed server-side here so both the
// wallet booking path and the Razorpay checkout-order path stay consistent and
// can't be tampered with from the client.

export interface CheckoutExtrasInput {
  promoCode?: string | null;
  addOns?: AddOnSelectionInput[] | null;
  baseFare: number; // the trusted base fare the discount applies to
}

export interface CheckoutExtras {
  promoCode: string | null;
  discountAmount: number;
  addOns: BookingAddOn[];
  addOnsTotal: number;
  finalTotal: number; // baseFare - discount + addOnsTotal, never below 0
}

export function resolveCheckoutExtras(input: CheckoutExtrasInput): CheckoutExtras {
  const base = input.baseFare > 0 ? input.baseFare : 0;
  const discount = computeDiscount(input.promoCode, base);
  const { addOns, total: addOnsTotal } = resolveAddOns(input.addOns ?? undefined);

  const finalTotal = Math.max(0, Math.round((base - discount.discountAmount + addOnsTotal) * 100) / 100);

  return {
    promoCode: discount.valid ? discount.code : null,
    discountAmount: discount.discountAmount,
    addOns,
    addOnsTotal,
    finalTotal,
  };
}
