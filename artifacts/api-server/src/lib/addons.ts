import type { BookingAddOn } from "@workspace/db";

// Static catalogue of optional checkout add-ons: travel insurance plans and
// pre-ordered food. Curated content, so it lives here like the offers/pass
// catalogues. Prices are charged server-side from this catalogue, never from the
// client, so a caller can't invent an add-on or its price.

export interface AddOnDef {
  id: string;
  kind: "insurance" | "food";
  name: string;
  description: string;
  price: number;
  unit: string;
}

export const INSURANCE: AddOnDef[] = [
  {
    id: "ins-basic",
    kind: "insurance",
    name: "Basic Travel Cover",
    description: "Covers up to ₹1,00,000 for accidental injury during the trip.",
    price: 19,
    unit: "per trip",
  },
  {
    id: "ins-plus",
    kind: "insurance",
    name: "Comfort Plus Cover",
    description: "Up to ₹3,00,000 accident cover plus ₹5,000 baggage protection.",
    price: 49,
    unit: "per trip",
  },
];

export const FOOD: AddOnDef[] = [
  {
    id: "food-veg-meal",
    kind: "food",
    name: "Veg Meal Box",
    description: "Sambar rice, curd rice, poriyal & a sweet. Served fresh on board.",
    price: 120,
    unit: "per item",
  },
  {
    id: "food-nonveg-meal",
    kind: "food",
    name: "Non-Veg Meal Box",
    description: "Chicken biryani with raita and a boiled egg.",
    price: 150,
    unit: "per item",
  },
  {
    id: "food-snack",
    kind: "food",
    name: "Snack & Beverage Combo",
    description: "Masala vada, a samosa and hot filter coffee or tea.",
    price: 80,
    unit: "per item",
  },
  {
    id: "food-water",
    kind: "food",
    name: "Water Bottle (1L)",
    description: "Sealed 1-litre packaged drinking water.",
    price: 20,
    unit: "per item",
  },
];

const ALL_ADDONS: AddOnDef[] = [...INSURANCE, ...FOOD];

export function findAddOn(id: string): AddOnDef | null {
  return ALL_ADDONS.find((a) => a.id === id) ?? null;
}

export interface AddOnSelectionInput {
  id: string;
  qty: number;
}

export interface ResolvedAddOnsResult {
  addOns: BookingAddOn[];
  total: number;
}

// Resolve client-selected add-ons against the catalogue. Unknown ids are
// dropped, quantities are clamped (insurance is capped at 1, food at 10), and
// the line totals/grand total are computed from catalogue prices only.
export function resolveAddOns(selections: AddOnSelectionInput[] | undefined): ResolvedAddOnsResult {
  if (!selections || selections.length === 0) return { addOns: [], total: 0 };

  const merged = new Map<string, number>();
  for (const sel of selections) {
    if (!sel || typeof sel.id !== "string") continue;
    const qty = Math.floor(Number(sel.qty));
    if (!(qty > 0)) continue;
    merged.set(sel.id, (merged.get(sel.id) ?? 0) + qty);
  }

  const addOns: BookingAddOn[] = [];
  let total = 0;
  for (const [id, rawQty] of merged) {
    const def = findAddOn(id);
    if (!def) continue;
    const cap = def.kind === "insurance" ? 1 : 10;
    const qty = Math.min(rawQty, cap);
    const lineTotal = Math.round(def.price * qty * 100) / 100;
    addOns.push({ id: def.id, kind: def.kind, name: def.name, price: def.price, qty, lineTotal });
    total += lineTotal;
  }
  total = Math.round(total * 100) / 100;
  return { addOns, total };
}
