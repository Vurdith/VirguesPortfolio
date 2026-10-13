import { SITE } from "@/lib/site";

import { addUsage, complete, type ModelMessage, type Usage } from "./model";
import { getThread, saveThread } from "./store";
import type { ChatThread } from "./types";

const NAME = SITE.name;

const SUMMARY_PROMPT = `You write the handover document that ${NAME}, a UI designer, reads instead of the chat. It comes from a sales chat between a customer and ${NAME}'s assistant. Use only what the customer actually said and what was quoted; never invent details. Plain text, no markdown, under 350 words. Use these labelled sections and skip any with nothing to say: OVERVIEW, GOAL, AUDIENCE AND PLATFORM, SCREENS (one line each: purpose, content, states), STYLE DIRECTION, REFERENCES (each "Ref N" with what to take from it), EXISTING ASSETS, DELIVERABLES, TIMELINE, BUDGET AND PRICE DISCUSSED (what was quoted, what the customer said about budget, what was conceded), OPEN QUESTIONS.`;

const CHAT_CHARS = 26_000;
const SUMMARY_TIMEOUT_MS = 25_000;

const clipText = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

/** The chat as plain text for the writer: what the customer said in full, the assistant's side trimmed. */
function chatText(thread: ChatThread): string {
  const lines = thread.messages.map((message) => {
    const images = message.images?.length ? ` [${message.images.length} image${message.images.length === 1 ? "" : "s"}]` : "";
    if (message.role === "user") return `CUSTOMER: ${clipText(message.content, 700)}${images}`;
    return `${message.by === "owner" ? NAME.toUpperCase() : "ASSISTANT"}: ${clipText(message.content, 240)}`;
  });
  const text = lines.join("\n");
  return text.length > CHAT_CHARS ? text.slice(-CHAT_CHARS) : text;
}

function fields(thread: ChatThread): string {
  const { brief } = thread;
  const unit = brief.styleReplication ? thread.styleOffer : thread.offer;
  return [
    `Name: ${brief.name || "-"} | Contact: ${brief.contact || "-"} | Platform: ${brief.platform || "-"}`,
    `Type: ${brief.styleReplication ? "style replication, per task" : "original design, per frame"} | Price on the table: £${unit}${brief.frames ? ` x ${brief.frames}` : ""} | Deadline: ${brief.deadline || "-"}`,
    `Screens: ${brief.screens.join(", ") || "-"}`,
    `Style: ${brief.style || "-"} | References: ${brief.references || "-"} | Extras: ${brief.extras || "-"}`,
  ].join("\n");
}

/** Writes the handover document for one conversation. Null when the model could not. */
export async function writeSummary(thread: ChatThread): Promise<{ text: string; costUsd: number; usage: Usage } | null> {
  const messages: ModelMessage[] = [
    { role: "system", content: SUMMARY_PROMPT },
    { role: "user", content: `BRIEF FIELDS\n${fields(thread)}\n\nCHAT\n${chatText(thread)}` },
  ];
  try {
    const done = await complete(messages, Date.now() + SUMMARY_TIMEOUT_MS, { json: false, think: "off", maxTokens: 1500 });
    const text = done.text.replace(/^```\w*\n?|```$/g, "").trim();
    if (!text) return null;
    return { text: clipText(text, 6000), costUsd: done.costUsd, usage: done.usage };
  } catch (err) {
    console.error("Summary failed:", err);
    return null;
  }
}

/**
 * Brings a conversation's summary up to date and saves it, unless it is already current. The chat
 * model never writes it, since that was the single most expensive thing it did each turn.
 */
export async function refreshSummary(thread: ChatThread): Promise<boolean> {
  if (!thread.userTurns || (thread.summaryTurn === thread.userTurns && thread.brief.summary)) return false;
  const made = await writeSummary(thread);
  if (!made) return false;

  const latest = (await getThread(thread.id)) ?? thread;
  latest.brief.summary = made.text;
  latest.summaryTurn = thread.userTurns;
  latest.costUsd = Number((latest.costUsd + made.costUsd).toFixed(6));
  latest.usage = addUsage(latest.usage, made.usage);
  await saveThread(latest);

  thread.brief.summary = latest.brief.summary;
  thread.summaryTurn = latest.summaryTurn;
  thread.costUsd = latest.costUsd;
  thread.usage = latest.usage;
  return true;
}
