import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  schedulesTable,
  routesTable,
  busesTable,
  ticketValidationsTable,
  occupancyReportsTable,
  cashCollectionsTable,
  fuelLogsTable,
  inspectionsTable,
  emergencyReportsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import {
  ValidateTicketBody,
  CreateOccupancyReportBody,
  CreateCashCollectionBody,
  CreateFuelLogBody,
  CreateInspectionBody,
  CreateEmergencyReportBody,
} from "@workspace/api-zod";
import { requireRole, getStaff } from "../middlewares/auth";

const router: IRouter = Router();

// ---- Staff profile ----

router.get("/staff/profile", requireRole("admin", "conductor", "driver"), (_req, res) => {
  const { passenger, crew, bus, depot } = getStaff(res);
  return res.json({
    role: passenger.role,
    crew: crew
      ? {
          id: crew.id,
          name: crew.name,
          role: crew.role,
          depotId: crew.depotId,
          phone: crew.phone,
          licenseNumber: crew.licenseNumber,
          status: crew.status,
          experienceYears: crew.experienceYears,
          safetyScore: Number(crew.safetyScore),
          assignedBusNumber: crew.assignedBusNumber,
        }
      : null,
    bus: bus
      ? { id: bus.id, busNumber: bus.busNumber, busType: bus.busType, totalSeats: bus.totalSeats }
      : null,
    depot: depot ? { id: depot.id, name: depot.name, city: depot.city } : null,
  });
});

// ---- Serializers ----

function serializeOccupancy(r: typeof occupancyReportsTable.$inferSelect) {
  return { ...r, reportedAt: r.reportedAt.toISOString() };
}

function serializeCash(r: typeof cashCollectionsTable.$inferSelect) {
  return {
    ...r,
    amount: Number(r.amount),
    collectedAt: r.collectedAt.toISOString(),
  };
}

function serializeFuel(r: typeof fuelLogsTable.$inferSelect) {
  return {
    ...r,
    liters: Number(r.liters),
    cost: Number(r.cost),
    loggedAt: r.loggedAt.toISOString(),
  };
}

function serializeInspection(r: typeof inspectionsTable.$inferSelect) {
  return { ...r, inspectedAt: r.inspectedAt.toISOString() };
}

function serializeEmergency(r: typeof emergencyReportsTable.$inferSelect) {
  return { ...r, reportedAt: r.reportedAt.toISOString() };
}

// ---- Conductor: ticket validation ----

router.post("/conductor/validate", requireRole("conductor", "admin"), async (req, res) => {
  const parsed = ValidateTicketBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { qr, pnr, scheduleId } = parsed.data;
  const { passenger, crew, bus } = getStaff(res);
  const assignedBus = bus?.busNumber ?? crew?.assignedBusNumber ?? null;

  // A conductor must be scoped to a bus or they could validate tickets across
  // the whole fleet. Admins are unscoped on purpose (oversight role).
  if (passenger.role === "conductor" && !assignedBus) {
    return res.status(403).json({ error: "No bus assigned to your account" });
  }

  // Extract a PNR from either an explicit field or a scanned QR payload.
  let lookupPnr = (pnr ?? "").trim();
  if (!lookupPnr && qr) {
    const raw = qr.trim();
    try {
      const obj = JSON.parse(raw) as { t?: string; pnr?: string };
      if (obj && typeof obj.pnr === "string") lookupPnr = obj.pnr.trim();
    } catch {
      // Not JSON — treat the scanned string itself as a PNR.
      lookupPnr = raw;
    }
  }

  if (!lookupPnr) {
    return res.status(400).json({ error: "No PNR or QR payload provided" });
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.pnr, lookupPnr))
    .limit(1);

  let result: "valid" | "duplicate" | "cancelled" | "not_found" | "mismatch";
  let message: string;

  if (!booking) {
    result = "not_found";
    message = `No booking found for PNR ${lookupPnr}`;
  } else if (booking.status === "cancelled") {
    result = "cancelled";
    message = "This ticket has been cancelled";
  } else if (assignedBus && booking.busNumber !== assignedBus) {
    result = "mismatch";
    message = `Ticket is for bus ${booking.busNumber}, not ${assignedBus}`;
  } else {
    // Duplicate if this PNR was already validated successfully before.
    const prior = await db
      .select()
      .from(ticketValidationsTable)
      .where(and(eq(ticketValidationsTable.pnr, lookupPnr), eq(ticketValidationsTable.result, "valid")))
      .limit(1);
    if (prior.length > 0) {
      result = "duplicate";
      message = "This ticket was already validated";
    } else {
      result = "valid";
      message = "Ticket valid — boarding confirmed";
    }
  }

  await db.insert(ticketValidationsTable).values({
    bookingId: booking?.id ?? null,
    pnr: lookupPnr,
    conductorId: crew?.id ?? null,
    busNumber: assignedBus,
    scheduleId: scheduleId ?? booking?.scheduleId ?? null,
    seatNumbers: booking?.seatNumbers ?? [],
    result,
  });

  return res.json({
    result,
    message,
    booking: booking
      ? {
          bookingId: booking.id,
          pnr: booking.pnr,
          passengerName: booking.passengerName,
          passengerPhone: booking.passengerPhone,
          seatNumbers: booking.seatNumbers,
          status: booking.status,
          totalFare: Number(booking.totalFare),
          origin: booking.origin,
          destination: booking.destination,
          departureTime: booking.departureTime,
          scheduleId: booking.scheduleId,
          validated: result === "valid" || result === "duplicate",
        }
      : null,
  });
});

// ---- Conductor: passenger manifest ----

router.get("/conductor/manifest", requireRole("conductor", "admin"), async (req, res) => {
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.json([]);

  const scheduleId = req.query.scheduleId !== undefined ? Number(req.query.scheduleId) : null;
  const whereClause =
    scheduleId !== null && Number.isInteger(scheduleId)
      ? and(eq(bookingsTable.busNumber, busNumber), eq(bookingsTable.scheduleId, scheduleId))
      : eq(bookingsTable.busNumber, busNumber);

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(whereClause)
    .orderBy(desc(bookingsTable.createdAt));

  // Flag any booking that already has a successful validation recorded.
  const validations = await db
    .select()
    .from(ticketValidationsTable)
    .where(and(eq(ticketValidationsTable.busNumber, busNumber), eq(ticketValidationsTable.result, "valid")));
  const validatedPnrs = new Set(validations.map((v) => v.pnr));

  return res.json(
    bookings.map((b) => ({
      bookingId: b.id,
      pnr: b.pnr,
      passengerName: b.passengerName,
      passengerPhone: b.passengerPhone,
      seatNumbers: b.seatNumbers,
      status: b.status,
      totalFare: Number(b.totalFare),
      origin: b.origin,
      destination: b.destination,
      departureTime: b.departureTime,
      scheduleId: b.scheduleId,
      validated: validatedPnrs.has(b.pnr),
    })),
  );
});

// ---- Conductor: live occupancy ----

router.get("/conductor/occupancy", requireRole("conductor", "admin"), async (_req, res) => {
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.json([]);
  const rows = await db
    .select()
    .from(occupancyReportsTable)
    .where(eq(occupancyReportsTable.busNumber, busNumber))
    .orderBy(desc(occupancyReportsTable.reportedAt))
    .limit(50);
  return res.json(rows.map(serializeOccupancy));
});

router.post("/conductor/occupancy", requireRole("conductor", "admin"), async (req, res) => {
  const parsed = CreateOccupancyReportBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.status(400).json({ error: "No assigned bus" });
  const capacity = bus?.totalSeats ?? 0;
  const [row] = await db
    .insert(occupancyReportsTable)
    .values({
      crewId: crew?.id ?? null,
      busNumber,
      scheduleId: parsed.data.scheduleId ?? null,
      occupancy: parsed.data.occupancy,
      capacity,
    })
    .returning();
  return res.status(201).json(serializeOccupancy(row));
});

// ---- Conductor: cash collection sync ----

router.get("/conductor/cash", requireRole("conductor", "admin"), async (_req, res) => {
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.json([]);
  const rows = await db
    .select()
    .from(cashCollectionsTable)
    .where(eq(cashCollectionsTable.busNumber, busNumber))
    .orderBy(desc(cashCollectionsTable.collectedAt))
    .limit(50);
  return res.json(rows.map(serializeCash));
});

router.post("/conductor/cash", requireRole("conductor", "admin"), async (req, res) => {
  const parsed = CreateCashCollectionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.status(400).json({ error: "No assigned bus" });
  const [row] = await db
    .insert(cashCollectionsTable)
    .values({
      crewId: crew?.id ?? null,
      busNumber,
      scheduleId: parsed.data.scheduleId ?? null,
      amount: String(parsed.data.amount),
      ticketsCount: parsed.data.ticketsCount,
      notes: parsed.data.notes ?? null,
      synced: true,
    })
    .returning();
  return res.status(201).json(serializeCash(row));
});

// ---- Driver: duty schedule ----

router.get("/driver/duty", requireRole("driver", "admin"), async (_req, res) => {
  const { bus } = getStaff(res);
  if (!bus) return res.json([]);
  const now = new Date();
  const rows = await db
    .select({
      scheduleId: schedulesTable.id,
      departureTime: schedulesTable.departureTime,
      arrivalTime: schedulesTable.arrivalTime,
      fare: schedulesTable.fare,
      availableSeats: schedulesTable.availableSeats,
      origin: routesTable.origin,
      destination: routesTable.destination,
    })
    .from(schedulesTable)
    .innerJoin(routesTable, eq(schedulesTable.routeId, routesTable.id))
    .where(eq(schedulesTable.busId, bus.id))
    .orderBy(schedulesTable.departureTime);

  return res.json(
    rows
      .filter((r) => r.arrivalTime >= now)
      .map((r) => ({
        scheduleId: r.scheduleId,
        busNumber: bus.busNumber,
        busType: bus.busType,
        origin: r.origin,
        destination: r.destination,
        departureTime: r.departureTime.toISOString(),
        arrivalTime: r.arrivalTime.toISOString(),
        fare: Number(r.fare),
        availableSeats: r.availableSeats,
      })),
  );
});

// ---- Driver: fuel logs ----

router.get("/driver/fuel", requireRole("driver", "admin"), async (_req, res) => {
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.json([]);
  const rows = await db
    .select()
    .from(fuelLogsTable)
    .where(eq(fuelLogsTable.busNumber, busNumber))
    .orderBy(desc(fuelLogsTable.loggedAt))
    .limit(50);
  return res.json(rows.map(serializeFuel));
});

router.post("/driver/fuel", requireRole("driver", "admin"), async (req, res) => {
  const parsed = CreateFuelLogBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.status(400).json({ error: "No assigned bus" });
  const [row] = await db
    .insert(fuelLogsTable)
    .values({
      crewId: crew?.id ?? null,
      busNumber,
      liters: String(parsed.data.liters),
      cost: String(parsed.data.cost),
      odometer: parsed.data.odometer ?? null,
      fuelType: parsed.data.fuelType ?? "diesel",
      notes: parsed.data.notes ?? null,
    })
    .returning();
  return res.status(201).json(serializeFuel(row));
});

// ---- Driver: inspection checklist ----

router.get("/driver/inspection", requireRole("driver", "admin"), async (_req, res) => {
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.json([]);
  const rows = await db
    .select()
    .from(inspectionsTable)
    .where(eq(inspectionsTable.busNumber, busNumber))
    .orderBy(desc(inspectionsTable.inspectedAt))
    .limit(50);
  return res.json(rows.map(serializeInspection));
});

router.post("/driver/inspection", requireRole("driver", "admin"), async (req, res) => {
  const parsed = CreateInspectionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.status(400).json({ error: "No assigned bus" });
  const items = parsed.data.items;
  const passed = items.every((i) => i.ok);
  const [row] = await db
    .insert(inspectionsTable)
    .values({
      crewId: crew?.id ?? null,
      busNumber,
      items,
      passed,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  return res.status(201).json(serializeInspection(row));
});

// ---- Driver: emergency reports ----

router.get("/driver/emergency", requireRole("driver", "admin"), async (_req, res) => {
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.json([]);
  const rows = await db
    .select()
    .from(emergencyReportsTable)
    .where(eq(emergencyReportsTable.busNumber, busNumber))
    .orderBy(desc(emergencyReportsTable.reportedAt))
    .limit(50);
  return res.json(rows.map(serializeEmergency));
});

router.post("/driver/emergency", requireRole("driver", "admin"), async (req, res) => {
  const parsed = CreateEmergencyReportBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { crew, bus } = getStaff(res);
  const busNumber = bus?.busNumber ?? crew?.assignedBusNumber ?? null;
  if (!busNumber) return res.status(400).json({ error: "No assigned bus" });
  const [row] = await db
    .insert(emergencyReportsTable)
    .values({
      crewId: crew?.id ?? null,
      busNumber,
      type: parsed.data.type,
      description: parsed.data.description,
      location: parsed.data.location ?? null,
      severity: parsed.data.severity ?? "medium",
    })
    .returning();
  return res.status(201).json(serializeEmergency(row));
});

export default router;
