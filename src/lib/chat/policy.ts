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
  /** Short answers the customer could tap instead of typing. */
  suggest: string[];
  /** The customer asked how to pay, so the payment buttons should show. */
  pay: boolean;
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
  // Nothing moves on the first message, and a concession needs a gap since the last one. The gap
  // grows by one message with every step already given, so each step down is harder than the last.
  if (turn < 2) return offer;
  const given = track.ladder.filter((rung) => rung > offer).length;
  const gap = CHAT_PRICE.turnsBetweenConcessions + Math.max(0, given - 1);
  if (lastConcessionTurn && turn - lastConcessionTurn < gap) return offer;
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
  const missing = [
    !brief.project.trim() && "what the project is",
    !brief.platform.trim() && "the platform",
    !brief.deadline.trim() && "the deadline (or that they have none)",
    !brief.screens.length && "the screens",
    !(brief.style.trim() || brief.references.trim()) && "the style direction or references",
  ].filter(Boolean);
  if (missing.length) return `The brief is still missing ${missing.join(", ")}. Ask about those until it could stand alone.`;
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
  // A concession with no number means "down to the lowest allowed"; the server decides how far it goes.
  if (output.concede && !(output.offer >= thread.offer) && lowest < thread.offer) {
    offer = lowest;
    lastConcessionTurn = turn;
  }

  const lowestStyle = lowestAllowedStyleOffer(thread, turn);
  let styleOffer = thread.styleOffer;
  let lastStyleConcessionTurn = thread.lastStyleConcessionTurn;
  if (output.concedeStyle && !(output.styleOffer >= thread.styleOffer) && lowestStyle < thread.styleOffer) {
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

/** Trims to `max` characters, ending on a whole word rather than mid-sentence. */
const clip = (value: unknown, max: number) => {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "")}…`;
};

/** Opening acknowledgements such as "Got it." or "Thanks Reece.", which the prompt bans and models still add. */
const FILLER_OPENER =
  /^(?:happy to help|glad to help|got it|noted|understood|thanks|thank you|great|perfect|awesome|brilliant|excellent|sounds good|sounds great|no problem)(?:\s+[A-Z][\w'’-]*)?\s*[.!]\s+/i;
const COMPLIMENT =
  /\b(?:sounds like (?:a |an )?(?:great|good|strong|solid|fun|cool|fantastic|wonderful)|great (?:pick|choice|idea|project|game|start)|love (?:that|this|the idea)|what a (?:great|cool|fun)|nice (?:one|choice|pick))\b/i;

/**
 * Removes what the prompt bans but models still add: opening acknowledgements, an opening
 * compliment, and "Virguê confirms the price" once it has already been said in the chat.
 * Never returns an empty reply.
 */
export function tidyReply(reply: string, earlier: string[]): string {
  let text = reply.trim();
  for (let i = 0; i < 3 && FILLER_OPENER.test(text); i++) text = text.replace(FILLER_OPENER, "");

  const first = /^([^.!?]*[.!])\s+/.exec(text);
  if (first && COMPLIMENT.test(first[1])) text = text.slice(first[0].length);

  if (earlier.some((past) => /Virguê confirms/i.test(past))) {
    const sentences = text.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [text];
    text = sentences.filter((sentence) => !(/^\s*Virguê confirms/i.test(sentence) && sentence.trim().split(/\s+/).length <= 12)).join("");
  }

  text = text.trim();
  if (text.length < 3) return reply.trim();
  return text[0].toUpperCase() + text.slice(1);
}

const STOP_WORDS = new Set(
  "the a an is are was do does did you your yours it its this that these those to of for on in at as by with and or but what which how any about me my i so if can could would should have has be been there also just some roughly more other else then than from will want need like such first".split(" "),
);
/** Questions about who they are or what they will pay are worth asking again; the rest should not be. */
const PERSISTENT = /\b(your name|call you|contact|reach|email|discord|budget|price|afford)\b/i;

type Clause = { text: string; words: Set<string> };

/** The questions in a reply, cut into their parts ("What genre is it, and which platform?" is two). */
function questionClauses(text: string): Clause[] {
  return (text.match(/[^.!?]*\?/g) ?? [])
    .flatMap((question) => question.split(/,?\s+(?:and|also|plus)\s+(?=\w)/i))
    .filter((clause) => !PERSISTENT.test(clause))
    .map((clause) => ({
      text: clause.replace(/^\s*[?,;:]+\s*/, "").trim(),
      words: new Set((clause.toLowerCase().match(/[a-z0-9£']+/g) ?? []).filter((word) => !STOP_WORDS.has(word))),
    }))
    .filter((clause) => clause.words.size >= 2);
}

const similar = (a: Set<string>, b: Set<string>) => {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared) >= 0.7;
};

/** The first question in `reply` that repeats one asked in the last two replies, or null. */
export function repeatedQuestion(reply: string, earlier: string[]): string | null {
  const before = earlier.slice(-2).flatMap(questionClauses);
  if (!before.length) return null;
  const repeat = questionClauses(reply).find((clause) => before.some((past) => similar(clause.words, past.words)));
  return repeat ? repeat.text.replace(/\?$/, "") : null;
}

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
  // Only changes are sent, so an empty or missing list means "unchanged".
  const listed = Array.isArray(b.screens) ? b.screens.map((screen) => clip(screen, 60)).filter(Boolean).slice(0, 60) : [];
  const screens = listed.length ? listed : previous.screens;

  const brief: ChatBrief = {
    ...EMPTY_BRIEF,
    name: clip(b.name, 80) || previous.name,
    contact: clip(b.contact, 160) || previous.contact,
    project: clip(b.project, 900) || previous.project,
    platform: clip(b.platform, 120) || previous.platform,
    frames: frames ?? previous.frames,
    styleReplication: typeof b.styleReplication === "boolean" ? b.styleReplication : previous.styleReplication,
    screens,
    style: clip(b.style, 1000) || previous.style,
    references: clip(b.references, 2000) || previous.references,
    deadline: clip(b.deadline, 160) || previous.deadline,
    budget: clip(b.budget, 160) || (previous.budget ?? ""),
    extras: clip(b.extras, 1000) || previous.extras,
    // The handover summary is written separately when the conversation ends, not by the chat model.
    summary: previous.summary,
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
    suggest: suggestions(data.suggest),
    pay: data.pay === true,
  };
}

/** Up to four short, distinct answers. "Not sure" is left out, since the site always offers it. */
function suggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .flatMap((item) => (typeof item === "string" ? [item.replace(/\s+/g, " ").trim()] : []))
    .filter((item) => {
      const key = item.toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (!key || item.length > 48 || /^(notsure|idk|idontknow)$/.test(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

/** An answer written as plain words instead of JSON. Null when it is empty or looks like broken JSON. */
export function plainReply(raw: string): string | null {
  const text = raw.replace(/^\s*```\w*\s*|\s*```\s*$/g, "").trim();
  if (!text || /[{}]|"reply"/.test(text)) return null;
  return clip(text, 2000) || null;
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
 * A long answer can be cut off before its closing brace. The reply comes first, so if that arrived
 * whole the customer still gets it; what the brief learned this turn is lost, and nothing about the
 * price or closing changes.
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
    suggest: [],
    pay: false,
  };
}
