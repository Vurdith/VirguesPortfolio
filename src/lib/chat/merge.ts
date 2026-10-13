import type { ChatThread } from "./types";

/**
 * A conversation can change while the assistant is working on a reply: the customer uploads an image,
 * or the owner joins, steers or ends the chat. Before saving the finished turn, fold in whatever
 * arrived meanwhile so nothing is overwritten.
 */
export function mergeConcurrent(thread: ChatThread, stored: ChatThread | null): void {
  if (!stored) return;

  thread.uploads = [...new Set([...thread.uploads, ...stored.uploads])];
  thread.takeover = stored.takeover;
  thread.steer = stored.steer ?? [];
  thread.handled = stored.handled;

  const known = new Set(thread.messages.map((message) => message.id));
  const arrived = stored.messages.filter((message) => !known.has(message.id));
  if (arrived.length) {
    thread.messages = [...thread.messages, ...arrived].sort((a, b) => a.at.localeCompare(b.at));
  }

  // The owner ended the chat while the assistant was replying.
  if (stored.status !== "open" && thread.status === "open") {
    thread.status = stored.status;
    thread.resolvedAt = stored.resolvedAt;
    thread.endReason = stored.endReason;
  }
}
