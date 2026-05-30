import { Router, type IRouter } from "express";
import { ValidateOfferBody } from "@workspace/api-zod";
import { activeOffers, computeDiscount } from "../lib/offers";
import { INSURANCE, FOOD } from "../lib/addons";
import { TOURISM_PACKAGES, findTourismPackage } from "../lib/tourism";

const router: IRouter = Router();

router.get("/offers", (_req, res) => {
  res.json(activeOffers());
});

router.post("/offers/validate", (req, res) => {
  const parsed = ValidateOfferBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const result = computeDiscount(parsed.data.code, Number(parsed.data.fare));
  return res.json(result);
});

router.get("/addons", (_req, res) => {
  res.json({ insurance: INSURANCE, food: FOOD });
});

router.get("/tourism-packages", (_req, res) => {
  res.json(TOURISM_PACKAGES);
});

router.get("/tourism-packages/:id", (req, res) => {
  const pkg = findTourismPackage(req.params.id);
  if (!pkg) return res.status(404).json({ error: "Tourism package not found" });
  return res.json(pkg);
});

export default router;
