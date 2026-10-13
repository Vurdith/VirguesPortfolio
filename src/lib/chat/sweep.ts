import { emailOwner } from "./email";
import { CHAT_LIMITS } from "./limits";
import { listThreads, saveThread } from "./store";
import { refreshSummary } from "./summary";

/** Each summary is a model call, so one sweep writes at most this many; the rest wait for the next. */
const SUMMARIES_PER_SWEEP = 5;

/**
 * Finds conversations that went quiet and tells the owner about each one once. A customer who left
 * contact details or got as far as a few messages is worth a follow-up even if they never confirmed.
 */
export async function sweepQuietChats(now = Date.now()): Promise<{ emailed: number; abandoned: number }> {
  let emailed = 0;
  let abandoned = 0;
  let summaries = 0;

  for (const thread of await listThreads()) {
    if (thread.status !== "open" || thread.takeover) continue;
    const quiet = now - Date.parse(thread.updatedAt);
    if (quiet < CHAT_LIMITS.quietMs) continue;

    const worthTelling = Boolean(thread.brief.contact) || thread.userTurns >= CHAT_LIMITS.minTurnsToConfirm;
    const tell = worthTelling && !thread.idleNotified;
    let changed = false;

    if (tell) {
      thread.idleNotified = true;
      thread.contactNotified = true;
      changed = true;
    }
    if (quiet > CHAT_LIMITS.idleMs) {
      thread.status = "abandoned";
      thread.endReason = "No reply for 3 hours";
      thread.lockedUntil = undefined;
      changed = true;
      abandoned += 1;
    }
    if (!changed) continue;

    await saveThread(thread);
    if (tell) {
      if (summaries < SUMMARIES_PER_SWEEP && (await refreshSummary(thread))) summaries += 1;
      await emailOwner(thread, "idle");
      emailed += 1;
    }
  }

  return { emailed, abandoned };
}
