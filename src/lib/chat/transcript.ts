import type { AdminBrief } from "./admin";

const who = (message: AdminBrief["messages"][number]) => (message.role === "user" ? "CUSTOMER" : message.owner ? "OWNER" : "AI");

const stamp = (iso: string) => new Date(iso).toISOString().replace("T", " ").slice(0, 16);

/** A conversation as plain text, for reading back and tuning the assistant. */
export function transcriptText(brief: AdminBrief): string {
  const { brief: info } = brief;
  const unit = info.styleReplication ? brief.styleOffer : brief.offer;
  const lines = [
    `Conversation ${brief.id}`,
    `Started ${stamp(brief.createdAt)} UTC · last activity ${stamp(brief.updatedAt)} UTC`,
    `Status: ${brief.status}${brief.endReason ? ` (${brief.endReason})` : ""} · handled: ${brief.handled}`,
    `Customer messages: ${brief.userTurns} · model cost: $${brief.costUsd.toFixed(4)}`,
    `Price on the table at the end: £${unit} per ${info.styleReplication ? "task" : "frame"}${info.frames ? ` × ${info.frames}` : ""}`,
    `Customer: ${info.name || "unknown"} · ${info.contact || "no contact"}`,
  ];
  if (brief.steer.length) lines.push("", "Owner guidance given to the AI:", ...brief.steer.map((item) => `- ${item.note}`));
  if (brief.lastError) lines.push("", `Last assistant error (${stamp(brief.lastError.at)} UTC): ${brief.lastError.message}`);

  lines.push("", "---", "");
  for (const message of brief.messages) {
    lines.push(`[${stamp(message.at).slice(11)}] ${who(message)}: ${message.content}`);
    if (message.images.length) {
      lines.push(`    (${message.images.length} image${message.images.length === 1 ? "" : "s"}: ${message.images.map((image) => image.url).join(" ")})`);
    }
    lines.push("");
  }

  lines.push("---", "", "BRIEF AS THE AI SAW IT", `Project: ${info.project || "—"}`, `Platform: ${info.platform || "—"}`, `Deadline: ${info.deadline || "—"}`);
  lines.push(`Screens: ${info.screens.join(", ") || "—"}`, `Style: ${info.style || "—"}`, `References: ${info.references || "—"}`, `Extras: ${info.extras || "—"}`);
  if (info.summary) lines.push("", "Summary:", info.summary);
  return lines.join("\n");
}

/** A filename-safe name for a download. */
export function transcriptName(brief: AdminBrief, extension: string): string {
  const name = (brief.brief.name || "chat").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "chat";
  return `${name}-${brief.createdAt.slice(0, 10)}-${brief.id.slice(0, 6)}.${extension}`;
}
