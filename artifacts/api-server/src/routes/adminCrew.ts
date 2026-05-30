import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { depotsTable, crewTable, busesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDepotBody, UpdateDepotBody, CreateCrewBody, UpdateCrewBody } from "@workspace/api-zod";
import { cityCoord } from "../lib/tnGeo";

const router: IRouter = Router();

function serializeDepot(d: typeof depotsTable.$inferSelect) {
  return {
    ...d,
    latitude: Number(d.latitude),
    longitude: Number(d.longitude),
    createdAt: d.createdAt.toISOString(),
  };
}

function serializeCrew(c: typeof crewTable.$inferSelect) {
  return {
    ...c,
    safetyScore: Number(c.safetyScore),
    createdAt: c.createdAt.toISOString(),
  };
}

// Reject ids that aren't positive integers so a bad path param can't reach the DB.
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ---- Depots ----

router.get("/admin/depots", async (_req, res) => {
  const rows = await db.select().from(depotsTable);
  return res.json(rows.map(serializeDepot));
});

router.post("/admin/depots", async (req, res) => {
  const parsed = CreateDepotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const coord = cityCoord(d.city);
  if (!coord) return res.status(400).json({ error: `Unknown city: ${d.city}` });
  const [depot] = await db
    .insert(depotsTable)
    .values({
      name: d.name,
      code: d.code,
      city: d.city,
      latitude: String(coord.lat),
      longitude: String(coord.lng),
      manager: d.manager ?? null,
      capacity: d.capacity ?? 50,
    })
    .returning();
  return res.status(201).json(serializeDepot(depot));
});

router.patch("/admin/depots/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Depot not found" });
  const parsed = UpdateDepotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const coord = cityCoord(d.city);
  if (!coord) return res.status(400).json({ error: `Unknown city: ${d.city}` });
  const [depot] = await db
    .update(depotsTable)
    .set({
      name: d.name,
      code: d.code,
      city: d.city,
      latitude: String(coord.lat),
      longitude: String(coord.lng),
      manager: d.manager ?? null,
      capacity: d.capacity ?? 50,
    })
    .where(eq(depotsTable.id, id))
    .returning();
  if (!depot) return res.status(404).json({ error: "Depot not found" });
  return res.json(serializeDepot(depot));
});

router.delete("/admin/depots/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Depot not found" });
  // Guard against orphaning buses/crew that still reference this depot.
  const [bus] = await db.select().from(busesTable).where(eq(busesTable.depotId, id)).limit(1);
  const [member] = await db.select().from(crewTable).where(eq(crewTable.depotId, id)).limit(1);
  if (bus || member) return res.status(409).json({ error: "Depot has assigned buses or crew" });
  const [depot] = await db.delete(depotsTable).where(eq(depotsTable.id, id)).returning();
  if (!depot) return res.status(404).json({ error: "Depot not found" });
  return res.status(204).end();
});

// ---- Crew ----

router.get("/admin/crew", async (_req, res) => {
  const rows = await db.select().from(crewTable);
  return res.json(rows.map(serializeCrew));
});

router.post("/admin/crew", async (req, res) => {
  const parsed = CreateCrewBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const c = parsed.data;
  const [member] = await db
    .insert(crewTable)
    .values({
      name: c.name,
      role: c.role,
      depotId: c.depotId ?? null,
      phone: c.phone ?? null,
      licenseNumber: c.licenseNumber ?? null,
      status: c.status ?? "on-duty",
      experienceYears: c.experienceYears ?? 0,
      safetyScore: c.safetyScore === undefined || c.safetyScore === null ? "85.00" : String(c.safetyScore),
      assignedBusNumber: c.assignedBusNumber ?? null,
    })
    .returning();
  return res.status(201).json(serializeCrew(member));
});

router.patch("/admin/crew/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Crew not found" });
  const parsed = UpdateCrewBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const c = parsed.data;
  const [member] = await db
    .update(crewTable)
    .set({
      name: c.name,
      role: c.role,
      depotId: c.depotId ?? null,
      phone: c.phone ?? null,
      licenseNumber: c.licenseNumber ?? null,
      status: c.status ?? "on-duty",
      experienceYears: c.experienceYears ?? 0,
      safetyScore: c.safetyScore === undefined || c.safetyScore === null ? "85.00" : String(c.safetyScore),
      assignedBusNumber: c.assignedBusNumber ?? null,
    })
    .where(eq(crewTable.id, id))
    .returning();
  if (!member) return res.status(404).json({ error: "Crew not found" });
  return res.json(serializeCrew(member));
});

router.delete("/admin/crew/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Crew not found" });
  const [member] = await db.delete(crewTable).where(eq(crewTable.id, id)).returning();
  if (!member) return res.status(404).json({ error: "Crew not found" });
  return res.status(204).end();
});

export default router;
