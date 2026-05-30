import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  busesTable,
  schedulesTable,
  maintenanceRecordsTable,
  fuelLogsTable,
  inspectionsTable,
} from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  CreateBusBody,
  UpdateBusBody,
  CreateBusMaintenanceBody,
  UpdateMaintenanceBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeBus(b: typeof busesTable.$inferSelect) {
  return {
    ...b,
    punctualityScore: Number(b.punctualityScore),
    amenities: b.amenities ?? [],
    createdAt: b.createdAt.toISOString(),
  };
}

function serializeMaintenance(m: typeof maintenanceRecordsTable.$inferSelect) {
  return {
    ...m,
    cost: Number(m.cost),
    serviceDate: m.serviceDate.toISOString(),
    nextServiceDue: m.nextServiceDue ? m.nextServiceDue.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  };
}

function serializeFuelLog(f: typeof fuelLogsTable.$inferSelect) {
  return {
    ...f,
    liters: Number(f.liters),
    cost: Number(f.cost),
    loggedAt: f.loggedAt.toISOString(),
  };
}

function serializeInspection(i: typeof inspectionsTable.$inferSelect) {
  return {
    ...i,
    items: i.items ?? [],
    inspectedAt: i.inspectedAt.toISOString(),
  };
}

// Reject ids that aren't positive integers so a bad path param can't reach the DB.
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Parse an optional date string. Returns null for absent/empty, a Date for a
// valid value, or "invalid" so the caller can reject bad input with 400 instead
// of letting `new Date("garbage")` reach the DB and throw a 500.
function parseDate(raw: string | null | undefined): Date | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

// Postgres unique-constraint violation. Pre-checks narrow most duplicates, but a
// concurrent insert can still race past them — catch the DB error to return a
// deterministic 409 rather than a generic 500.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

async function getBus(id: number) {
  const [bus] = await db.select().from(busesTable).where(eq(busesTable.id, id)).limit(1);
  return bus ?? null;
}

// ---- Bus CRUD ----

router.post("/admin/buses", async (req, res) => {
  const parsed = CreateBusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;

  // Bus number is unique; reject duplicates up front for a clean 409 instead of
  // surfacing a raw DB constraint error.
  const [existing] = await db
    .select()
    .from(busesTable)
    .where(eq(busesTable.busNumber, d.busNumber))
    .limit(1);
  if (existing) return res.status(409).json({ error: "Bus number already exists" });

  try {
    const [bus] = await db
      .insert(busesTable)
      .values({
        busNumber: d.busNumber,
        busType: d.busType,
        totalSeats: d.totalSeats,
        amenities: d.amenities ?? [],
        status: d.status ?? "active",
        currentLocation: d.currentLocation ?? null,
        driverName: d.driverName ?? null,
        routeId: d.routeId ?? null,
        depotId: d.depotId ?? null,
      })
      .returning();
    return res.status(201).json(serializeBus(bus));
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: "Bus number already exists" });
    throw err;
  }
});

router.patch("/admin/buses/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Bus not found" });
  const parsed = UpdateBusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;

  const current = await getBus(id);
  if (!current) return res.status(404).json({ error: "Bus not found" });

  const numberChanged = d.busNumber !== current.busNumber;

  // If the bus number is changing, make sure it doesn't collide with another bus.
  if (numberChanged) {
    const [clash] = await db
      .select()
      .from(busesTable)
      .where(eq(busesTable.busNumber, d.busNumber))
      .limit(1);
    if (clash) return res.status(409).json({ error: "Bus number already exists" });
  }

  try {
    // fuel_logs and inspections are keyed by bus_number text, so a rename must
    // cascade to them in the same transaction or their history orphans and
    // disappears from the per-bus drawer.
    const [bus] = await db.transaction(async (tx) => {
      if (numberChanged) {
        await tx
          .update(fuelLogsTable)
          .set({ busNumber: d.busNumber })
          .where(eq(fuelLogsTable.busNumber, current.busNumber));
        await tx
          .update(inspectionsTable)
          .set({ busNumber: d.busNumber })
          .where(eq(inspectionsTable.busNumber, current.busNumber));
      }
      return tx
        .update(busesTable)
        .set({
          busNumber: d.busNumber,
          busType: d.busType,
          totalSeats: d.totalSeats,
          amenities: d.amenities ?? [],
          status: d.status ?? current.status,
          currentLocation: d.currentLocation ?? null,
          driverName: d.driverName ?? null,
          routeId: d.routeId ?? null,
          depotId: d.depotId ?? null,
        })
        .where(eq(busesTable.id, id))
        .returning();
    });
    return res.json(serializeBus(bus));
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: "Bus number already exists" });
    throw err;
  }
});

router.delete("/admin/buses/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Bus not found" });

  // Guard against deleting a bus that still has upcoming schedules — that would
  // orphan trips passengers may already be booked on.
  const now = new Date();
  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(and(eq(schedulesTable.busId, id), gte(schedulesTable.departureTime, now)))
    .limit(1);
  if (schedule) return res.status(409).json({ error: "Bus still has active schedules" });

  const [bus] = await db.delete(busesTable).where(eq(busesTable.id, id)).returning();
  if (!bus) return res.status(404).json({ error: "Bus not found" });

  // Maintenance records are owned by the bus; clean them up so they don't linger.
  await db.delete(maintenanceRecordsTable).where(eq(maintenanceRecordsTable.busId, id));
  return res.status(204).end();
});

// ---- Maintenance records ----

router.get("/admin/buses/:id/maintenance", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Bus not found" });
  const rows = await db
    .select()
    .from(maintenanceRecordsTable)
    .where(eq(maintenanceRecordsTable.busId, id))
    .orderBy(desc(maintenanceRecordsTable.serviceDate));
  return res.json(rows.map(serializeMaintenance));
});

router.post("/admin/buses/:id/maintenance", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Bus not found" });
  const parsed = CreateBusMaintenanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;

  const bus = await getBus(id);
  if (!bus) return res.status(404).json({ error: "Bus not found" });

  const serviceDate = parseDate(d.serviceDate);
  const nextServiceDue = parseDate(d.nextServiceDue);
  if (serviceDate === "invalid" || nextServiceDue === "invalid")
    return res.status(400).json({ error: "Invalid date" });

  const [record] = await db
    .insert(maintenanceRecordsTable)
    .values({
      busId: id,
      type: d.type,
      description: d.description ?? null,
      cost: d.cost === undefined || d.cost === null ? "0" : String(d.cost),
      odometer: d.odometer ?? null,
      status: d.status ?? "completed",
      serviceDate: serviceDate ?? new Date(),
      nextServiceDue: nextServiceDue,
    })
    .returning();
  return res.status(201).json(serializeMaintenance(record));
});

router.patch("/admin/maintenance/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Maintenance record not found" });
  const parsed = UpdateMaintenanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;

  const [current] = await db
    .select()
    .from(maintenanceRecordsTable)
    .where(eq(maintenanceRecordsTable.id, id))
    .limit(1);
  if (!current) return res.status(404).json({ error: "Maintenance record not found" });

  const serviceDate = parseDate(d.serviceDate);
  const nextServiceDue = parseDate(d.nextServiceDue);
  if (serviceDate === "invalid" || nextServiceDue === "invalid")
    return res.status(400).json({ error: "Invalid date" });

  const [record] = await db
    .update(maintenanceRecordsTable)
    .set({
      type: d.type,
      description: d.description ?? null,
      cost: d.cost === undefined || d.cost === null ? String(current.cost) : String(d.cost),
      odometer: d.odometer ?? null,
      status: d.status ?? current.status,
      serviceDate: serviceDate ?? current.serviceDate,
      nextServiceDue: nextServiceDue,
    })
    .where(eq(maintenanceRecordsTable.id, id))
    .returning();
  return res.json(serializeMaintenance(record));
});

router.delete("/admin/maintenance/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Maintenance record not found" });
  const [record] = await db
    .delete(maintenanceRecordsTable)
    .where(eq(maintenanceRecordsTable.id, id))
    .returning();
  if (!record) return res.status(404).json({ error: "Maintenance record not found" });
  return res.status(204).end();
});

// ---- Per-bus fuel logs & inspections (keyed by bus number in their tables) ----

router.get("/admin/buses/:id/fuel-logs", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Bus not found" });
  const bus = await getBus(id);
  if (!bus) return res.status(404).json({ error: "Bus not found" });
  const rows = await db
    .select()
    .from(fuelLogsTable)
    .where(eq(fuelLogsTable.busNumber, bus.busNumber))
    .orderBy(desc(fuelLogsTable.loggedAt));
  return res.json(rows.map(serializeFuelLog));
});

router.get("/admin/buses/:id/inspections", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(404).json({ error: "Bus not found" });
  const bus = await getBus(id);
  if (!bus) return res.status(404).json({ error: "Bus not found" });
  const rows = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.busNumber, bus.busNumber))
    .orderBy(desc(inspectionsTable.inspectedAt));
  return res.json(rows.map(serializeInspection));
});

export default router;
