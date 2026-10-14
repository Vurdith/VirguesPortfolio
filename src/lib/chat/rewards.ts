import { checkReward } from "@/lib/discordNotify";
import { SITE } from "@/lib/site";

import { rewardTerms } from "./rewardTerms";
import type { ChatReward, ChatThread } from "./types";

const NAME = SITE.name;

/** A reward code as the Discord bot hands them out, such as VG-ABCD-2345. */
const CODE_IN = /\bVG-[A-Z2-9]{4}-[A-Z2-9]{4}\b/i;

/** Codes checked per conversation, so nobody can guess at them through the chat. */
const MAX_TRIES = 5;

/** The name a conversation goes by with the bot. */
export const briefKey = (thread: Pick<ChatThread, "id">) => `chat:${thread.id}`;

/** Said to the assistant on every turn once a reward is on the conversation. */
export function rewardNote(reward: ChatReward): string {
  return reward.kind === "voucher"
    ? `- Reward applied: ${reward.title} (${reward.code}), ${rewardTerms(reward)}. It comes off the total after any concession and does not change the per-frame price. Whenever you state a total, give the full total, then the total after the voucher. Never take off more than it allows.`
    : `- Reward applied: ${reward.title} (${reward.code}), ${rewardTerms(reward)}. It is part of the scope at no charge: never price it, and record it in "extras".`;
}

/**
 * Looks for a reward code in the customer's message and checks it with the Discord bot. A good one
 * goes on the conversation. Returns what the assistant should be told this turn, or null when the
 * message has no code.
 */
export async function readRewardCode(thread: ChatThread, said: string): Promise<string | null> {
  const code = CODE_IN.exec(said)?.[0].toUpperCase();
  if (!code) return null;
  if (thread.reward?.code === code) return `The customer mentioned their reward code ${code} again. It is already applied.`;
  if (thread.reward) {
    return `The customer gave a second reward code, ${code}. One reward goes on a commission and ${thread.reward.code} (${thread.reward.title}) is already applied, so tell them this one was not.`;
  }
  if ((thread.codeTries ?? 0) >= MAX_TRIES) {
    return `The customer gave a reward code, ${code}, but too many codes have been tried in this chat, so it was not checked. Tell them ${NAME} will check it by hand, and record "Reward code: ${code} (unchecked)" in "extras".`;
  }
  thread.codeTries = (thread.codeTries ?? 0) + 1;

  const result = await checkReward(code, briefKey(thread));
  if (!result) {
    return `The customer gave a reward code, ${code}, but it could not be checked right now. Tell them ${NAME} will check it and honour it if it is valid, and record "Reward code: ${code} (unchecked)" in "extras".`;
  }
  if (!result.valid) {
    return result.reason === "taken"
      ? `The customer's reward code ${code} has already been used on another brief, so it cannot be applied. Say so plainly.`
      : `${code} is not a valid reward code. Ask them to check it; codes look like VG-ABCD-2345 and are in their inventory on Discord.`;
  }
  thread.reward = {
    code,
    title: result.title,
    kind: result.kind,
    ...(result.percent ? { percent: result.percent } : {}),
    ...(result.cap ? { cap: result.cap } : {}),
    ...(result.worth ? { worth: result.worth } : {}),
    at: new Date().toISOString(),
  };
  return `The customer's reward code ${code} is valid and is now applied: ${result.title}. Confirm it in a few words, and if a total is already known, give the total after it.`;
}

/**
 * Spends the code on this brief, once the brief is sent on, so it cannot go on another. Returns
 * true when the conversation changed and should be saved. Asked again later if the bot did not answer.
 */
export async function claimReward(thread: ChatThread): Promise<boolean> {
  if (!thread.reward || thread.reward.claimed !== undefined) return false;
  const result = await checkReward(thread.reward.code, briefKey(thread), true);
  if (!result) return false;
  thread.reward.claimed = result.valid;
  return true;
}
