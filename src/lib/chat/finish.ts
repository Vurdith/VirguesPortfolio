import { emailOwner, type OwnerEmailReason } from "./email";
import { getThread } from "./store";
import { refreshSummary } from "./summary";

/**
 * Runs after the customer has their last reply: writes the handover summary, then emails the owner.
 * Doing it afterwards keeps the extra model call off the customer's wait.
 */
export async function finishChat(id: string, reason: Extract<OwnerEmailReason, "confirmed" | "limit">): Promise<void> {
  try {
    const thread = await getThread(id);
    if (!thread) return;
    await refreshSummary(thread);
    await emailOwner(thread, reason);
  } catch (err) {
    console.error("Finishing the chat failed:", err);
  }
}
