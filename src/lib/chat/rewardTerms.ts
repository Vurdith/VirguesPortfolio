import type { ChatReward } from "./types";

// Kept apart from rewards.ts, which talks to the Discord bot, so the admin pages can use these in the browser.

/** What a reward does to the quote, in a few words. */
export function rewardTerms(reward: ChatReward): string {
  if (reward.kind === "voucher" && reward.percent) return `${reward.percent}% off the total${reward.cap ? `, at most £${reward.cap} off` : ""}`;
  return `${reward.title} included at no charge${reward.worth ? ` (worth £${reward.worth})` : ""}`;
}

/** The pounds a voucher takes off a total. */
export function rewardSaving(reward: ChatReward | undefined, total: number | null): number {
  if (!reward || reward.kind !== "voucher" || !reward.percent || !total) return 0;
  const off = Math.round(total * reward.percent) / 100;
  return reward.cap ? Math.min(off, reward.cap) : off;
}
