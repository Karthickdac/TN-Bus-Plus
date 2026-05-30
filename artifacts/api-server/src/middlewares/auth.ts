import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { passengersTable, crewTable, busesTable, depotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface StaffContext {
  passenger: typeof passengersTable.$inferSelect;
  crew: typeof crewTable.$inferSelect | null;
  bus: typeof busesTable.$inferSelect | null;
  depot: typeof depotsTable.$inferSelect | null;
}

// Resolve the signed-in passenger and, if they are linked to a crew profile,
// their crew row plus the bus and depot it is assigned to. Returns null when
// there is no session or the session points at a missing passenger.
export async function loadStaff(req: Request): Promise<StaffContext | null> {
  const id = req.session.passengerId;
  if (!id) return null;

  const [passenger] = await db
    .select()
    .from(passengersTable)
    .where(eq(passengersTable.id, id))
    .limit(1);
  if (!passenger) return null;

  let crew: StaffContext["crew"] = null;
  let bus: StaffContext["bus"] = null;
  let depot: StaffContext["depot"] = null;

  if (passenger.crewId) {
    const crewRows = await db
      .select()
      .from(crewTable)
      .where(eq(crewTable.id, passenger.crewId))
      .limit(1);
    crew = crewRows[0] ?? null;
  }

  if (crew?.assignedBusNumber) {
    const busRows = await db
      .select()
      .from(busesTable)
      .where(eq(busesTable.busNumber, crew.assignedBusNumber))
      .limit(1);
    bus = busRows[0] ?? null;
  }

  if (crew?.depotId) {
    const depotRows = await db
      .select()
      .from(depotsTable)
      .where(eq(depotsTable.id, crew.depotId))
      .limit(1);
    depot = depotRows[0] ?? null;
  }

  return { passenger, crew, bus, depot };
}

// Express guard: require an authenticated staff member with one of `roles`.
// On success, stashes the resolved StaffContext on res.locals.staff so handlers
// derive their bus/depot from the session (never a client-supplied id -> no IDOR).
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const staff = await loadStaff(req);
    if (!staff) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(staff.passenger.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.locals.staff = staff;
    next();
  };
}

export function getStaff(res: Response): StaffContext {
  return res.locals.staff as StaffContext;
}
