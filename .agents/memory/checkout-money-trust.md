---
name: Checkout money trust
description: How TN Bus+ computes the charged amount server-side so clients can't tamper with fares, discounts, or add-on totals.
---

# Checkout money trust

The amount actually charged for a booking (wallet, Razorpay, or simulated direct
path) is always computed server-side. The client-sent `totalFare` must never
determine the charge whenever the authoritative schedule fare is known.

**Rule:** base fare = `trustedFare` (schedule price × seats) whenever
`trustedFare > 0`, for *every* payment method. Only fall back to the
client-supplied `totalFare` for walk-in/POS bookings against a schedule with no
known fare (the only case where the client value is the sole source).

`resolveCheckoutExtras({ promoCode, addOns, baseFare })` then applies the promo
discount and add-on prices (both server-side catalogues) on top of the base, and
`finalTotal = base - discount + addOnsTotal` is what gets charged, stored on the
booking row, and stored on the payment row.

**Why:** an earlier version used `payByWallet ? trustedFare : data.totalFare`,
which let non-wallet direct bookings undercharge by sending a tiny `totalFare`.
Caught in review; verified by a tamper test (sending `totalFare:1` against a ₹520
schedule still charges the trusted total).

**How to apply:** any new checkout/charge path must derive its base from the
trusted server fare and run it through `resolveCheckoutExtras`. Reward points stay
based on `trustedFare` only (not discount/add-ons). Both `POST /bookings`
(bookings.ts) and `POST /bookings/checkout-order` (payments.ts) follow this.
