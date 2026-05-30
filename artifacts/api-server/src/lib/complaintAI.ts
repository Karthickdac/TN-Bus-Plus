import { anthropic } from "@workspace/integrations-anthropic-ai";

// Complaint analysis: categorize, sentiment-score and flag escalation. Uses the
// Anthropic integration, but always falls back to a deterministic heuristic so
// complaint handling keeps working if the AI service is unavailable.

const MODEL = "claude-sonnet-4-6";

export const COMPLAINT_CATEGORIES = [
  "safety",
  "cleanliness",
  "delay",
  "staff",
  "ticketing",
  "overcrowding",
  "refund",
  "other",
] as const;

export type Sentiment = "positive" | "neutral" | "negative";

export interface ComplaintAnalysis {
  aiCategory: string;
  sentiment: Sentiment;
  sentimentScore: number; // -1..1
  escalated: boolean;
  aiSummary: string;
  source: "ai" | "heuristic";
}

export interface ComplaintAnalysisInput {
  description: string;
  category?: string | null;
  busNumber?: string | null;
}

const NEGATIVE_WORDS = [
  "worst", "terrible", "horrible", "rude", "filthy", "dirty", "unsafe", "danger",
  "accident", "rash", "drunk", "harass", "late", "delay", "cheat", "fraud", "broken",
  "angry", "disgust", "pathetic", "never", "refund", "overcrowd", "stink", "abuse",
];
const POSITIVE_WORDS = ["thank", "good", "great", "clean", "polite", "helpful", "comfortable", "appreciate", "excellent", "smooth"];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function heuristic(input: ComplaintAnalysisInput): ComplaintAnalysis {
  const text = `${input.description}`.toLowerCase();
  let category = (input.category ?? "other").toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["safety", ["unsafe", "danger", "accident", "rash", "drunk", "harass", "abuse", "speed"]],
    ["cleanliness", ["dirty", "filthy", "stink", "clean", "smell", "garbage"]],
    ["delay", ["late", "delay", "wait", "missed", "schedule"]],
    ["overcrowding", ["crowd", "overcrowd", "packed", "no seat", "standing"]],
    ["refund", ["refund", "money back", "cancel", "charged"]],
    ["ticketing", ["ticket", "booking", "pnr", "fare", "qr"]],
    ["staff", ["driver", "conductor", "staff", "rude", "behaviour", "behavior"]],
  ];
  for (const [cat, words] of rules) {
    if (words.some(w => text.includes(w))) { category = cat; break; }
  }
  if (!COMPLAINT_CATEGORIES.includes(category as (typeof COMPLAINT_CATEGORIES)[number])) category = "other";

  let neg = 0, pos = 0;
  for (const w of NEGATIVE_WORDS) if (text.includes(w)) neg++;
  for (const w of POSITIVE_WORDS) if (text.includes(w)) pos++;
  const score = clamp((pos - neg) / 5, -1, 1);
  const sentiment: Sentiment = score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral";
  const escalated = category === "safety" || score <= -0.5;
  const summary = input.description.length > 110 ? `${input.description.slice(0, 107).trim()}...` : input.description;
  return { aiCategory: category, sentiment, sentimentScore: Number(score.toFixed(3)), escalated, aiSummary: summary, source: "heuristic" };
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}

export async function analyzeComplaint(input: ComplaintAnalysisInput): Promise<ComplaintAnalysis> {
  try {
    const system =
      "You are an operations analyst for a Tamil Nadu government bus service. " +
      "Analyze a passenger complaint and respond with ONLY a JSON object, no prose. " +
      `Fields: category (one of ${COMPLAINT_CATEGORIES.join(", ")}), ` +
      "sentiment (positive|neutral|negative), sentimentScore (number -1 to 1, negative = unhappy), " +
      "escalate (boolean: true for safety risks, harassment, accidents, or strongly negative experiences), " +
      "summary (one concise sentence, max 18 words).";
    const userContent =
      `Complaint category hint: ${input.category ?? "unknown"}\n` +
      `Bus: ${input.busNumber ?? "n/a"}\n` +
      `Text: ${input.description}`;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: userContent }],
    });
    const block = msg.content.find(b => b.type === "text");
    if (!block || block.type !== "text") throw new Error("no text block");
    const parsed = extractJson(block.text) as Record<string, unknown>;

    let category = String(parsed["category"] ?? "other").toLowerCase().trim();
    if (!COMPLAINT_CATEGORIES.includes(category as (typeof COMPLAINT_CATEGORIES)[number])) category = "other";
    const sentRaw = String(parsed["sentiment"] ?? "neutral").toLowerCase().trim();
    const sentiment: Sentiment = sentRaw === "positive" || sentRaw === "negative" ? (sentRaw as Sentiment) : "neutral";
    const sentimentScore = clamp(Number(parsed["sentimentScore"] ?? 0) || 0, -1, 1);
    const escalated = Boolean(parsed["escalate"]) || category === "safety";
    const aiSummary = String(parsed["summary"] ?? input.description).slice(0, 200).trim();

    return { aiCategory: category, sentiment, sentimentScore: Number(sentimentScore.toFixed(3)), escalated, aiSummary, source: "ai" };
  } catch {
    return heuristic(input);
  }
}
