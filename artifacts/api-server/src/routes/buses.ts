import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { busesTable, schedulesTable, routesTable, busLocationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/buses", async (_req, res) => {
  const rows = await db.select().from(busesTable);
  res.json(rows.map(b => ({
    ...b,
    punctualityScore: Number(b.punctualityScore),
    amenities: b.amenities ?? [],
  })));
});

router.get("/buses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select().from(busesTable).where(eq(busesTable.id, id));
  if (!row) return res.status(404).json({ error: "Bus not found" });
  return res.json({ ...row, punctualityScore: Number(row.punctualityScore), amenities: row.amenities ?? [] });
});

// Seat layout for a schedule
router.get("/schedules/:scheduleId/seats", async (req, res) => {
  const scheduleId = parseInt(req.params.scheduleId);
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
  if (!schedule) return res.status(404).json({ error: "Schedule not found" });

  const [bus] = await db.select().from(busesTable).where(eq(busesTable.id, schedule.busId));
  if (!bus) return res.status(404).json({ error: "Bus not found" });

  // Generate seat layout
  const totalSeats = bus.totalSeats;
  const seatsPerRow = 4;
  const rows = Math.ceil(totalSeats / seatsPerRow);
  const bookedCount = Math.max(0, totalSeats - schedule.availableSeats);
  // Deterministic per-schedule occupancy: same seats every load (seeded by scheduleId).
  const seeded = (n: number) => {
    const x = Math.sin(n) * 43758.5453;
    return x - Math.floor(x);
  };
  const bookedSeats = new Set<number>(
    Array.from({ length: totalSeats }, (_, i) => i)
      .sort((a, b) => seeded(scheduleId * 1000 + a) - seeded(scheduleId * 1000 + b))
      .slice(0, bookedCount),
  );

  const seats = [];
  let seatIndex = 0;
  const columns = ["A", "B", "C", "D"];
  for (let row = 1; row <= rows; row++) {
    for (let col = 0; col < seatsPerRow; col++) {
      if (seatIndex >= totalSeats) break;
      const isAvailable = !bookedSeats.has(seatIndex);
      const isWomenOnly = row <= 2 && (col === 0 || col === 1);
      seats.push({
        seatNumber: `${row}${columns[col]}`,
        row,
        column: col + 1,
        type: bus.busType.includes("Sleeper") ? "sleeper" : "seater",
        isAvailable,
        isWomenOnly,
        price: Number(schedule.fare) + (isWomenOnly ? 0 : col >= 2 ? 20 : 0),
      });
      seatIndex++;
    }
  }
  return res.json(seats);
});

export default router;
