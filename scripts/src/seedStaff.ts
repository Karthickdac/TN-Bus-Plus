import { db, passengersTable, crewTable, busesTable, schedulesTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Idempotent staff seed. Creates (or updates) one login per staff role linked to
 * an existing crew profile so conductor/driver portals have real accounts to test
 * against. Re-running is safe: accounts are matched by email and upserted.
 */

interface StaffSeed {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "conductor" | "driver";
  crewRole?: "conductor" | "driver";
}

const STAFF: StaffSeed[] = [
  { name: "TNSTC Admin", email: "admin@tnbus.gov.in", phone: "9000000001", password: "staff123", role: "admin" },
  { name: "Conductor Login", email: "conductor@tnbus.gov.in", phone: "9000000002", password: "staff123", role: "conductor", crewRole: "conductor" },
  { name: "Driver Login", email: "driver@tnbus.gov.in", phone: "9000000003", password: "staff123", role: "driver", crewRole: "driver" },
];

async function pickCrewId(role: "conductor" | "driver"): Promise<number | null> {
  const [member] = await db.select().from(crewTable).where(eq(crewTable.role, role)).limit(1);
  return member?.id ?? null;
}

// Ensure each staff member's assigned bus has at least one upcoming schedule so
// the driver duty portal isn't empty. Idempotent: skips buses that already have
// a future schedule.
async function seedUpcomingSchedules() {
  const buses = await db.select().from(busesTable);
  const now = new Date();
  for (const bus of buses) {
    if (bus.routeId === null) continue;
    if (!["TN01N1234", "TN07N6789"].includes(bus.busNumber)) continue;

    const future = await db
      .select()
      .from(schedulesTable)
      .where(and(eq(schedulesTable.busId, bus.id), gte(schedulesTable.arrivalTime, now)))
      .limit(1);
    if (future.length > 0) continue;

    for (let day = 1; day <= 2; day++) {
      const departure = new Date(now);
      departure.setDate(departure.getDate() + day);
      departure.setHours(8, 0, 0, 0);
      const arrival = new Date(departure);
      arrival.setHours(arrival.getHours() + 6);
      await db.insert(schedulesTable).values({
        busId: bus.id,
        routeId: bus.routeId,
        departureTime: departure,
        arrivalTime: arrival,
        fare: "450.00",
        availableSeats: 30,
      });
    }
    console.log(`seeded upcoming schedules for bus ${bus.busNumber}`);
  }
}

async function run() {
  for (const s of STAFF) {
    const crewId = s.crewRole ? await pickCrewId(s.crewRole) : null;
    const passwordHash = await bcrypt.hash(s.password, 12);

    const [existing] = await db.select().from(passengersTable).where(eq(passengersTable.email, s.email)).limit(1);
    if (existing) {
      await db
        .update(passengersTable)
        .set({ name: s.name, phone: s.phone, passwordHash, role: s.role, crewId })
        .where(eq(passengersTable.id, existing.id));
      console.log(`updated staff ${s.email} (role=${s.role}, crewId=${crewId})`);
    } else {
      await db
        .insert(passengersTable)
        .values({ name: s.name, email: s.email, phone: s.phone, passwordHash, role: s.role, crewId });
      console.log(`created staff ${s.email} (role=${s.role}, crewId=${crewId})`);
    }
  }
  await seedUpcomingSchedules();
  console.log("staff seed complete");
  process.exit(0);
}

run().catch((err) => {
  console.error("staff seed failed", err);
  process.exit(1);
});
