import { anthropic } from "@workspace/integrations-anthropic-ai";

// Plain-language operational insights for admins. Summarizes pre-aggregated
// metrics via Anthropic, with a deterministic heuristic fallback so the
// dashboard still renders if the AI service is unavailable.

const MODEL = "claude-sonnet-4-6";

export type InsightSeverity = "positive" | "info" | "warning" | "critical";

export interface InsightItem {
  title: string;
  detail: string;
  severity: InsightSeverity;
  category: string;
}

export interface InsightsContext {
  totalBuses: number;
  activeBuses: number;
  onTimePercentage: number;
  revenueToday: number;
  bookingsToday: number;
  openComplaints: number;
  escalatedComplaints: number;
  negativeComplaints: number;
  topComplaintCategory: string | null;
  fleetAlerts: number;
  breakdowns: number;
  highMaintenanceRisk: number;
  flaggedDrivers: number;
  topRoute: string | null;
  peakHour: number | null;
}

function heuristic(c: InsightsContext): InsightItem[] {
  const items: InsightItem[] = [];
  items.push({
    title: "Fleet availability",
    detail: `${c.activeBuses} of ${c.totalBuses} buses are active with an on-time rate of ${c.onTimePercentage}%.`,
    severity: c.onTimePercentage >= 85 ? "positive" : c.onTimePercentage >= 70 ? "info" : "warning",
    category: "operations",
  });
  if (c.escalatedComplaints > 0 || c.negativeComplaints > 0) {
    items.push({
      title: "Complaint escalations need attention",
      detail: `${c.escalatedComplaints} escalated and ${c.negativeComplaints} negative complaints are open${c.topComplaintCategory ? `, mostly about ${c.topComplaintCategory}` : ""}.`,
      severity: c.escalatedComplaints > 0 ? "critical" : "warning",
      category: "complaints",
    });
  }
  if (c.breakdowns > 0 || c.highMaintenanceRisk > 0) {
    items.push({
      title: "Maintenance risk in the fleet",
      detail: `${c.highMaintenanceRisk} buses are at high maintenance risk and ${c.breakdowns} reported a breakdown. Schedule preventive servicing.`,
      severity: c.breakdowns > 0 ? "critical" : "warning",
      category: "maintenance",
    });
  }
  if (c.flaggedDrivers > 0) {
    items.push({
      title: "Driver coaching opportunities",
      detail: `${c.flaggedDrivers} drivers show risky behaviour patterns (harsh braking / overspeed). Consider targeted coaching.`,
      severity: "warning",
      category: "safety",
    });
  }
  items.push({
    title: "Demand & revenue",
    detail: `₹${c.revenueToday.toFixed(0)} earned today across ${c.bookingsToday} bookings${c.topRoute ? `; ${c.topRoute} is the busiest corridor` : ""}${c.peakHour !== null ? `, peaking around ${c.peakHour}:00` : ""}.`,
    severity: "info",
    category: "revenue",
  });
  return items;
}

function extractJsonArray(text: string): unknown {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) throw new Error("no json array");
  return JSON.parse(text.slice(start, end + 1));
}

const ALLOWED_SEVERITY: InsightSeverity[] = ["positive", "info", "warning", "critical"];

export async function generateInsights(c: InsightsContext): Promise<{ insights: InsightItem[]; source: "ai" | "heuristic" }> {
  try {
    const system =
      "You are an operations strategist for a Tamil Nadu government bus service. " +
      "Given operational metrics, produce 4-6 concise, actionable insights for administrators. " +
      "Respond with ONLY a JSON array. Each item: { title (max 6 words), detail (one sentence, plain language), " +
      "severity (positive|info|warning|critical), category (operations|complaints|maintenance|safety|revenue|demand) }.";
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: JSON.stringify(c) }],
    });
    const block = msg.content.find(b => b.type === "text");
    if (!block || block.type !== "text") throw new Error("no text block");
    const arr = extractJsonArray(block.text);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("empty");
    const insights: InsightItem[] = arr.slice(0, 6).map((raw: Record<string, unknown>) => {
      const sev = String(raw["severity"] ?? "info").toLowerCase() as InsightSeverity;
      return {
        title: String(raw["title"] ?? "Insight").slice(0, 80),
        detail: String(raw["detail"] ?? "").slice(0, 280),
        severity: ALLOWED_SEVERITY.includes(sev) ? sev : "info",
        category: String(raw["category"] ?? "operations").slice(0, 40),
      };
    });
    return { insights, source: "ai" };
  } catch {
    return { insights: heuristic(c), source: "heuristic" };
  }
}
