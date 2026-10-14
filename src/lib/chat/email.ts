import { notifyOwner } from "@/lib/notify";
import { SITE } from "@/lib/site";

import { chatImageLink } from "./images";
import { rewardSaving, rewardTerms } from "./rewardTerms";
import type { ChatThread } from "./types";

export type OwnerEmailReason = "confirmed" | "limit" | "contact" | "idle";

const HEADLINE: Record<OwnerEmailReason, string> = {
  confirmed: "Confirmed by the customer: that is everything.",
  limit: "Chat ended at its message limit.",
  contact: "The customer just left their contact details. The chat is still open.",
  idle: "The customer stopped replying. The chat is still unfinished.",
};

const SUBJECT: Record<OwnerEmailReason, string> = {
  confirmed: "New design brief",
  limit: "New design brief",
  contact: "Lead left contact details",
  idle: "Chat went quiet",
};

export function emailFor(thread: ChatThread, reason: OwnerEmailReason): string {
  const { brief } = thread;
  const replica = brief.styleReplication;
  const unit = replica ? thread.styleOffer : thread.offer;
  const sum = brief.frames ? brief.frames * unit : null;
  const total = sum ? `£${sum.toLocaleString("en-GB")}` : "—";
  const reward = thread.reward;
  const saving = rewardSaving(reward, sum);
  const spent = reward?.claimed === false ? "NOT spent: it had already gone on another brief" : reward?.claimed ? "spent on this brief" : "not spent yet";
  const transcript = thread.messages
    .map((message) => `${message.role === "user" ? "CUSTOMER" : "ASSISTANT"}: ${message.content}${message.images?.length ? ` [${message.images.length} image(s)]` : ""}`)
    .join("\n\n")
    .slice(0, 20_000);
  const images = thread.uploads.map(chatImageLink);
  return [
    HEADLINE[reason],
    "",
    `Name: ${brief.name || "—"}`,
    `Contact: ${brief.contact || "—"}`,
    `Platform: ${brief.platform || "—"}`,
    `Type: ${replica ? "Style replication (matching an existing look)" : "Original design"}`,
    `${replica ? "Tasks" : "Frames"}: ${brief.frames ?? "—"}  ·  Price discussed: £${unit} per ${replica ? "task" : "frame"}  ·  Total: ${total}`,
    `Deadline: ${brief.deadline || "—"}`,
    `Budget: ${brief.budget || "—"}`,
    ...(reward
      ? [`Reward: ${reward.title} (${reward.code}) · ${rewardTerms(reward)}${sum && saving ? ` · Total after it: £${(sum - saving).toLocaleString("en-GB")}` : ""} · ${spent}`]
      : []),
    "",
    "SUMMARY",
    brief.summary || "—",
    "",
    `Project: ${brief.project || "—"}`,
    `Screens: ${brief.screens.join(", ") || "—"}`,
    `Style: ${brief.style || "—"}`,
    `References: ${brief.references || "—"}`,
    `Extras: ${brief.extras || "—"}`,
    ...(images.length ? ["", "REFERENCE IMAGES", ...images] : []),
    "",
    `Full conversation in the admin: ${SITE.url}/admin/briefs`,
    "",
    "TRANSCRIPT",
    transcript,
  ].join("\n");
}

export async function emailOwner(thread: ChatThread, reason: OwnerEmailReason): Promise<void> {
  const who = thread.brief.name ? ` from ${thread.brief.name}` : "";
  await notifyOwner(`${SUBJECT[reason]}${who}`, emailFor(thread, reason));
}
