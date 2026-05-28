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
  res.json({ ...row, punctualityScore: Number(row.punctualityScore), amenities: row.amenities ?? [] });
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
  const bookedCount = totalSeats - schedule.availableSeats;
  const bookedSeats = new Set<number>();
  while (bookedSeats.size < bookedCount) {
    bookedSeats.add(Math.floor(Math.random() * totalSeats));
  }

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
  res.json(seats);
});

export default router;
