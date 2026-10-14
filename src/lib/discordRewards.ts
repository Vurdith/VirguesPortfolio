import { discordNotifyUrl } from "@/lib/discordNotify";

/** The subscriber count is only shown once it is worth showing. */
export const MIN_SUBSCRIBERS_SHOWN = 10;

const STATS_REVALIDATE_S = 300;
const AVATAR_HOST = "https://cdn.discordapp.com/";
const WALL_SIZE = 24;
const DROPS_SHOWN = 6;

/** A voucher takes a share off a commission; a service is a piece of work. */
export type DiscordReward = { title: string; cost: number; detail: string; kind: "voucher" | "service" };
export type DiscordInviter = { name: string; avatar: string; invites: number; rank: string };
export type DiscordDrop = { title: string; at: string };

export type DiscordStats = {
  subscribers: number;
  invites: number;
  /** Top inviters who chose to be listed, highest first. Often empty. */
  wall: DiscordInviter[];
  /** What subscribers were given for free, newest first. */
  drops: DiscordDrop[];
  /** What points buy, in the order the service lists them. */
  rewards: DiscordReward[];
};

/** Shown until the service lists its own rewards. One point per invite. */
export const FALLBACK_REWARDS: DiscordReward[] = [
  { title: "5% voucher", cost: 3, detail: "", kind: "voucher" },
  { title: "15% voucher", cost: 6, detail: "", kind: "voucher" },
  { title: "25% voucher", cost: 10, detail: "", kind: "voucher" },
];

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
const records = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];

/**
 * The service's public numbers, with anything missing or malformed dropped: it is another
 * deployment, so nothing it sends is trusted to have the right shape. Null when it is not an object.
 */
export function readStats(json: unknown): DiscordStats | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const data = json as Record<string, unknown>;
  return {
    subscribers: count(data.subscribers),
    invites: count(data.invites),
    wall: records(data.wall)
      .map((entry) => {
        const avatar = text(entry.avatar, 300);
        return {
          name: text(entry.name, 40),
          avatar: avatar.startsWith(AVATAR_HOST) ? avatar : "",
          invites: count(entry.invites),
          rank: text(entry.rank, 40),
        };
      })
      .filter((entry) => entry.name)
      .slice(0, WALL_SIZE),
    drops: records(data.drops)
      .map((drop) => ({ title: text(drop.title, 80), at: text(drop.at, 40) }))
      .filter((drop) => drop.title)
      .slice(0, DROPS_SHOWN),
    rewards: records(data.rewards)
      .map((reward): DiscordReward => {
        const title = text(reward.title, 60);
        // Older answers name no kind, so a title that opens with a percentage is taken for a voucher.
        const voucher = reward.kind === "voucher" || (reward.kind !== "service" && /^\d{1,3}%/.test(title));
        return { title, cost: count(reward.cost), detail: text(reward.detail, 160), kind: voucher ? "voucher" : "service" };
      })
      .filter((reward) => reward.title && reward.cost),
  };
}

/** Subscriber count, top inviters, drops and rewards, or null when the service is off or not answering. */
export async function getDiscordStats(): Promise<DiscordStats | null> {
  const base = discordNotifyUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/stats`, {
      next: { revalidate: STATS_REVALIDATE_S },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? readStats(await res.json()) : null;
  } catch {
    return null;
  }
}
