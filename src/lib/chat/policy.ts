import { CHAT_LIMITS, CHAT_PRICE } from "./limits";
import { EMPTY_BRIEF, type ChatBrief, type ChatThread } from "./types";

/**
 * Everything the model is not trusted with. The prompt asks it to hold the price, but a customer can
 * type anything, so the rules that matter (the floors, the pace of concessions, when a conversation
 * may be closed) are enforced here on whatever the model returns.
 */

export type AgentOutput = {
  reply: string;
  brief: ChatBrief;
  /** Per-frame price the model says is on the table. */
  offer: number;
  concede: boolean;
  /** Per-task price for matching an existing style. */
  styleOffer: number;
  concedeStyle: boolean;
  awaitingConfirm: boolean;
  resolved: boolean;
};

type Track = { ladder: readonly number[]; floor: number };
const FRAME: Track = { ladder: CHAT_PRICE.ladder, floor: CHAT_PRICE.floor };
const STYLE: Track = { ladder: CHAT_PRICE.style.ladder, floor: CHAT_PRICE.style.floor };

/** The next rung below `offer`, or the floor when there is none. */
function nextRung(track: Track, offer: number): number {
  const lower = track.ladder.filter((rung) => rung < offer);
  return lower.length ? Math.max(...lower) : track.floor;
}

function lowestOn(track: Track, offer: number, lastConcessionTurn: number, turn: number): number {
  // Nothing moves on the first message, and a concession needs a gap since the last one.
  if (turn < 2) return offer;
  if (lastConcessionTurn && turn - lastConcessionTurn < CHAT_PRICE.turnsBetweenConcessions) return offer;
  return Math.max(track.floor, nextRung(track, offer));
}

/** The lowest per-frame price the agent may reach on this customer message. */
export const lowestAllowedOffer = (thread: Pick<ChatThread, "offer" | "lastConcessionTurn">, turn: number) =>
  lowestOn(FRAME, thread.offer, thread.lastConcessionTurn, turn);

/** The lowest per-task price for style replication on this customer message. */
export const lowestAllowedStyleOffer = (
  thread: Pick<ChatThread, "styleOffer" | "lastStyleConcessionTurn">,
  turn: number,
) => lowestOn(STYLE, thread.styleOffer, thread.lastStyleConcessionTurn, turn);

/** Amounts a reply states against a unit, such as "£48 per frame", "£48/frame" or "£48 a screen". */
function statedRates(reply: string, unit: string): number[] {
  const pattern = new RegExp(`£\\s?(\\d+(?:\\.\\d{1,2})?)\\s*(?:\\/|per|a|each|for each|for one)?\\s*(?:${unit})`, "gi");
  return [...reply.matchAll(pattern)].map((match) => Number(match[1]));
}

export const statedFrameRates = (reply: string) => statedRates(reply, "frame|screen");
export const statedTaskRates = (reply: string) => statedRates(reply, "task");

/**
 * True when the reply quotes a price below what this turn allows. Task rates only count from £60 up:
 * importing and small tasks have their own, lower prices that are fine to mention.
 */
export function undercutsPrice(reply: string, lowestFrame: number, lowestStyle: number): boolean {
  return (
    statedFrameRates(reply).some((rate) => rate < lowestFrame) ||
    statedTaskRates(reply).some((rate) => rate >= CHAT_PRICE.list && rate < lowestStyle)
  );
}

/** Why the assistant may not ask "is that everything?" or close yet, or null when it may. */
export function closingBlockedReason(brief: ChatBrief, turn: number): string | null {
  if (turn < CHAT_LIMITS.minTurnsToConfirm) {
    return "You have not asked enough questions yet. Keep digging into the screens, style, references, platform, deliverables and timeline.";
  }
  if (!brief.contact.trim()) return "You still need the customer's name and a way to reach them.";
  if (brief.summary.trim().length < CHAT_LIMITS.minSummaryChars) {
    return "The brief is not detailed enough yet. Ask about each screen, the style and the references until the summary could stand alone.";
  }
  return null;
}

export type TurnResult = {
  offer: number;
  lastConcessionTurn: number;
  styleOffer: number;
  lastStyleConcessionTurn: number;
  awaitingConfirm: boolean;
  resolved: boolean;
};

/** Applies the rules to one model turn. `turn` is this customer message's number, counting from 1. */
export function applyTurn(thread: ChatThread, output: AgentOutput, turn: number): TurnResult {
  // Each price only ever moves down, one rung at a time, and only when the model says it is conceding.
  const lowest = lowestAllowedOffer(thread, turn);
  let offer = thread.offer;
  let lastConcessionTurn = thread.lastConcessionTurn;
  if (output.concede && output.offer < thread.offer && lowest < thread.offer) {
    offer = lowest;
    lastConcessionTurn = turn;
  }

  const lowestStyle = lowestAllowedStyleOffer(thread, turn);
  let styleOffer = thread.styleOffer;
  let lastStyleConcessionTurn = thread.lastStyleConcessionTurn;
  if (output.concedeStyle && output.styleOffer < thread.styleOffer && lowestStyle < thread.styleOffer) {
    styleOffer = lowestStyle;
    lastStyleConcessionTurn = turn;
  }

  // The conversation can only reach "is that everything?" once it is deep and complete enough, and can
  // only close if the customer was already asked that on an earlier turn.
  const mayClose = closingBlockedReason(output.brief, turn) === null;
  const resolved = output.resolved && thread.awaitingConfirm && mayClose;

  return {
    offer,
    lastConcessionTurn,
    styleOffer,
    lastStyleConcessionTurn,
    awaitingConfirm: resolved ? false : output.awaitingConfirm && mayClose,
    resolved,
  };
}

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Reads the model's JSON. Tolerates fences and surrounding prose; returns null if it is unusable. */
export function parseAgentOutput(raw: string, previous: ChatBrief): AgentOutput | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1) return null;
  if (end <= start) return salvageReply(raw, previous);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return salvageReply(raw, previous);
  }

  const reply = clip(data.reply, 2000);
  if (!reply) return null;

  const b = (data.brief && typeof data.brief === "object" ? data.brief : {}) as Record<string, unknown>;
  const frames =
    typeof b.frames === "number" && Number.isFinite(b.frames) ? Math.max(0, Math.min(500, Math.round(b.frames))) : null;
  const screens = Array.isArray(b.screens)
    ? b.screens.map((screen) => clip(screen, 80)).filter(Boolean).slice(0, 60)
    : previous.screens;

  const brief: ChatBrief = {
    ...EMPTY_BRIEF,
    name: clip(b.name, 80) || previous.name,
    contact: clip(b.contact, 160) || previous.contact,
    project: clip(b.project, 600) || previous.project,
    platform: clip(b.platform, 120) || previous.platform,
    frames: frames ?? previous.frames,
    styleReplication: typeof b.styleReplication === "boolean" ? b.styleReplication : previous.styleReplication,
    screens,
    style: clip(b.style, 800) || previous.style,
    references: clip(b.references, 1500) || previous.references,
    deadline: clip(b.deadline, 160) || previous.deadline,
    extras: clip(b.extras, 800) || previous.extras,
    summary: clip(b.summary, 6000) || previous.summary,
  };

  const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : Number.NaN);
  return {
    reply,
    brief,
    offer: number(data.offer),
    concede: data.concede === true,
    styleOffer: number(data.styleOffer),
    concedeStyle: data.concedeStyle === true,
    awaitingConfirm: data.awaitingConfirm === true,
    resolved: data.resolved === true,
  };
}

/** A safe line to send when the model keeps quoting a price it may not offer. */
export function holdPriceReply(thread: Pick<ChatThread, "offer" | "styleOffer" | "brief">): string {
  const { brief } = thread;
  const unit = brief.styleReplication ? thread.styleOffer : thread.offer;
  const noun = brief.styleReplication ? "task" : "frame";
  const total = brief.frames
    ? ` For ${brief.frames} ${noun}${brief.frames === 1 ? "" : "s"} that comes to £${(brief.frames * unit).toLocaleString("en-GB")}.`
    : "";
  return `I can do £${unit} per ${noun}.${total} That's the best I can offer right now, and it covers custom design work with a clean handoff. What would you like to adjust, or is there anything else I should know about the project?`;
}

/**
 * A long answer can be cut off before its closing brace (the brief's summary is last and the
 * longest). The reply comes first, so if that arrived whole the customer still gets it; what the
 * brief learned this turn is lost, and nothing about the price or closing changes.
 */
function salvageReply(raw: string, previous: ChatBrief): AgentOutput | null {
  const match = /"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(raw);
  if (!match) return null;
  let reply = "";
  try {
    reply = clip(JSON.parse(`"${match[1]}"`), 2000);
  } catch {
    return null;
  }
  if (!reply) return null;
  return {
    reply,
    brief: previous,
    offer: Number.NaN,
    concede: false,
    styleOffer: Number.NaN,
    concedeStyle: false,
    awaitingConfirm: false,
    resolved: false,
  };
}
