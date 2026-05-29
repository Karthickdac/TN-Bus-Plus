import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AssistantChatBody } from "@workspace/api-zod";
import { searchTrips, type TripFilters, type TripResult } from "../lib/searchTrips";

const router: IRouter = Router();

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;
const MAX_TOOL_ITERATIONS = 4;
const MAX_TRIPS = 6;

type SortKey = "cheapest" | "earliest" | "fastest" | "least_crowded";

interface SearchToolInput extends TripFilters {
  sort?: SortKey;
}

function minutesBetween(departISO: string, arriveISO: string): number {
  const dep = new Date(departISO).getTime();
  const arr = new Date(arriveISO).getTime();
  return Number.isFinite(dep) && Number.isFinite(arr) ? (arr - dep) / 60000 : Number.POSITIVE_INFINITY;
}

function crowdRank(c: string | undefined): number {
  switch ((c ?? "").toLowerCase()) {
    case "low":
      return 0;
    case "medium":
      return 1;
    case "high":
      return 2;
    default:
      return 1;
  }
}

function sortTrips(trips: TripResult[], sort: SortKey | undefined): TripResult[] {
  const arr = [...trips];
  switch (sort) {
    case "cheapest":
      arr.sort((a, b) => a.fare - b.fare);
      break;
    case "fastest":
      arr.sort(
        (a, b) =>
          minutesBetween(a.departureTime, a.arrivalTime) -
          minutesBetween(b.departureTime, b.arrivalTime),
      );
      break;
    case "least_crowded":
      arr.sort(
        (a, b) =>
          crowdRank(a.crowdDensity) - crowdRank(b.crowdDensity) ||
          b.availableSeats - a.availableSeats,
      );
      break;
    case "earliest":
    default:
      arr.sort(
        (a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime(),
      );
      break;
  }
  return arr;
}

const searchTool = {
  name: "search_trips",
  description:
    "Search live Tamil Nadu government bus schedules. Call this whenever the traveller wants to find, compare, or book a bus. Returns matching trips with fare, timing, amenities and comfort/crowd scores.",
  input_schema: {
    type: "object" as const,
    properties: {
      origin: { type: "string", description: "Departure city, e.g. Chennai" },
      destination: { type: "string", description: "Arrival city, e.g. Coimbatore" },
      ac: { type: "boolean", description: "Only air-conditioned buses" },
      sleeper: { type: "boolean", description: "Only sleeper buses" },
      chargingPort: { type: "boolean", description: "Buses with charging ports" },
      liveGps: { type: "boolean", description: "Buses with live GPS tracking" },
      toilet: { type: "boolean", description: "Buses with onboard toilet" },
      womenFriendly: { type: "boolean", description: "Women-friendly buses" },
      lowCrowd: { type: "boolean", description: "Prefer low-occupancy buses" },
      nightBus: { type: "boolean", description: "Overnight departures" },
      sort: {
        type: "string",
        enum: ["cheapest", "earliest", "fastest", "least_crowded"],
        description: "How to order results based on the traveller's priority",
      },
    },
    required: [],
  },
};

router.post("/assistant/chat", async (req, res) => {
  const parsed = AssistantChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }
  const { message, lang = "en", history = [] } = parsed.data;

  // Personalize from the signed-in traveller's recent bookings, if any.
  let travellerContext = "";
  const passengerId = req.session?.passengerId;
  if (passengerId) {
    try {
      const recent = await db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.passengerId, passengerId))
        .orderBy(desc(bookingsTable.id))
        .limit(5);
      if (recent.length) {
        const routes = recent
          .map(b => `${b.origin} to ${b.destination}`)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 5);
        travellerContext = `\n\nThe signed-in traveller has recently booked these routes: ${routes.join(
          "; ",
        )}. Use this to personalise suggestions when relevant.`;
      }
    } catch (err) {
      req.log.warn({ err }, "assistant: failed to load traveller bookings");
    }
  }

  const langName = lang === "ta" ? "Tamil" : "English";
  const system = `You are "TN Bus+ Assistant", a warm, concise travel companion for the Tamil Nadu State Transport bus booking app. \
Help travellers find and book government buses across Tamil Nadu. \
ALWAYS reply in ${langName}. If the user writes in the other language, still answer in ${langName} unless they switch. \
When the traveller wants to find, compare or book a bus, call the search_trips tool with the cities and any preferences (AC, sleeper, night, women-friendly, low crowd, charging port, toilet, live GPS) and an appropriate sort. \
After getting results, summarise the best 1-3 options conversationally — mention fare in rupees, departure time and why it fits — and invite them to tap a trip card to book. \
If a city is missing, ask one short clarifying question. Keep replies short and friendly. Never invent trips that the tool did not return.${travellerContext}`;

  type Msg = { role: "user" | "assistant"; content: any };
  const messages: Msg[] = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  let collectedTrips: TripResult[] = [];
  let intent: SearchToolInput | undefined;
  let reply = "";

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools: [searchTool],
        messages,
      });

      const textParts = resp.content
        .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
        .map(b => b.text);
      if (textParts.length) reply = textParts.join("\n").trim();

      if (resp.stop_reason !== "tool_use") break;

      const toolUses = resp.content.filter(
        (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
      );
      messages.push({ role: "assistant", content: resp.content });

      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const input = (tu.input ?? {}) as SearchToolInput;
        const { sort, ...filters } = input;
        intent = input;
        const found = await searchTrips(filters);
        const sorted = sortTrips(found, sort).slice(0, MAX_TRIPS);
        collectedTrips = sorted;
        const summary = sorted.map(t => ({
          scheduleId: t.scheduleId,
          busType: t.busType,
          origin: t.origin,
          destination: t.destination,
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          fare: t.fare,
          availableSeats: t.availableSeats,
          crowdDensity: t.crowdDensity,
          amenities: t.amenities,
        }));
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify({ count: sorted.length, trips: summary }),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    if (!reply) {
      reply =
        lang === "ta"
          ? "மன்னிக்கவும், இப்போது பதில் அளிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
          : "Sorry, I couldn't respond right now. Please try again.";
    }

    res.json({ reply, trips: collectedTrips, intent: intent ?? null });
  } catch (err) {
    req.log.error({ err }, "assistant: chat failed");
    res.status(502).json({
      error: "assistant_unavailable",
      reply:
        lang === "ta"
          ? "உதவியாளர் தற்போது கிடைக்கவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்."
          : "The assistant is temporarily unavailable. Please try again shortly.",
      trips: [],
      intent: null,
    });
  }
});

export default router;
