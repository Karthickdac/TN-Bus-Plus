// Static catalogue of promotional offers. Government fare discounts are curated
// content (not user-generated), so they live here like the pass catalogue. All
// discount maths runs server-side so a client can never invent a code or amount.

export interface OfferDef {
  code: string;
  title: string;
  description: string;
  discountType: "percent" | "flat";
  discountValue: number;
  maxDiscount: number | null; // cap for percent offers (rupees); null = uncapped
  minFare: number; // minimum base fare for eligibility
  category: string;
  validUntil: string; // ISO date
}

// Far-future validity keeps these seedless offers "active" without a cron.
const VALID_UNTIL = "2027-12-31T23:59:59.000Z";

export const OFFERS: OfferDef[] = [
  {
    code: "WELCOME10",
    title: "Welcome aboard — 10% off",
    description: "Get 10% off your bus fare, up to ₹100. Great for your first few rides on TN Bus+.",
    discountType: "percent",
    discountValue: 10,
    maxDiscount: 100,
    minFare: 100,
    category: "New rider",
    validUntil: VALID_UNTIL,
  },
  {
    code: "TNSTC50",
    title: "Flat ₹50 off intercity",
    description: "Save a flat ₹50 on any booking of ₹300 or more across Tamil Nadu.",
    discountType: "flat",
    discountValue: 50,
    maxDiscount: null,
    minFare: 300,
    category: "Intercity",
    validUntil: VALID_UNTIL,
  },
  {
    code: "WEEKEND15",
    title: "Weekend getaway — 15% off",
    description: "Planning a weekend trip? Take 15% off, up to ₹150, on fares above ₹250.",
    discountType: "percent",
    discountValue: 15,
    maxDiscount: 150,
    minFare: 250,
    category: "Weekend",
    validUntil: VALID_UNTIL,
  },
  {
    code: "STUDENT20",
    title: "Student saver — 20% off",
    description: "Students travel for less: 20% off, up to ₹120, on fares above ₹150.",
    discountType: "percent",
    discountValue: 20,
    maxDiscount: 120,
    minFare: 150,
    category: "Students",
    validUntil: VALID_UNTIL,
  },
];

export function findOffer(code: string | null | undefined): OfferDef | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return OFFERS.find((o) => o.code === normalized) ?? null;
}

export function isOfferActive(offer: OfferDef): boolean {
  return new Date(offer.validUntil).getTime() >= Date.now();
}

export function activeOffers(): OfferDef[] {
  return OFFERS.filter(isOfferActive);
}

export interface DiscountResult {
  valid: boolean;
  code: string | null;
  discountAmount: number;
  message: string;
}

// Compute the discount a code gives against a base fare. Never returns a
// discount larger than the fare itself. Money is rounded to 2 decimals.
export function computeDiscount(code: string | null | undefined, baseFare: number): DiscountResult {
  if (!code || !code.trim()) {
    return { valid: false, code: null, discountAmount: 0, message: "No promo code entered." };
  }
  const offer = findOffer(code);
  if (!offer) {
    return { valid: false, code: null, discountAmount: 0, message: "That promo code isn't valid." };
  }
  if (!isOfferActive(offer)) {
    return { valid: false, code: null, discountAmount: 0, message: "That offer has expired." };
  }
  if (!(baseFare > 0)) {
    return { valid: false, code: null, discountAmount: 0, message: "Add a fare before applying an offer." };
  }
  if (baseFare < offer.minFare) {
    return {
      valid: false,
      code: null,
      discountAmount: 0,
      message: `This offer needs a minimum fare of ₹${offer.minFare}.`,
    };
  }

  let discount =
    offer.discountType === "percent" ? (baseFare * offer.discountValue) / 100 : offer.discountValue;
  if (offer.maxDiscount !== null) discount = Math.min(discount, offer.maxDiscount);
  discount = Math.min(discount, baseFare);
  discount = Math.round(discount * 100) / 100;

  return {
    valid: true,
    code: offer.code,
    discountAmount: discount,
    message: `${offer.title} applied — you save ₹${discount.toFixed(2)}.`,
  };
}
