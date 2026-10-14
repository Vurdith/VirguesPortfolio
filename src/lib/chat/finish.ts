import { emailOwner, type OwnerEmailReason } from "./email";
import { claimReward } from "./rewards";
import { getThread, saveThread } from "./store";
import { refreshSummary } from "./summary";

/**
 * Runs after the customer has their last reply: spends any reward code on the brief, writes the
 * handover summary, then emails the owner. Doing it afterwards keeps it all off the customer's wait.
 */
export async function finishChat(id: string, reason: Extract<OwnerEmailReason, "confirmed" | "limit">): Promise<void> {
  try {
    const thread = await getThread(id);
    if (!thread) return;
    if (await claimReward(thread)) await saveThread(thread);
    const updated = await refreshSummary(thread);
    await emailOwner(updated ?? thread, reason);
  } catch (err) {
    console.error("Finishing the chat failed:", err);
  }
}
