/** Limits for the brief assistant, shared by the API and the chat window so they cannot drift. */
export const CHAT_LIMITS = {
  /** Longest single message. */
  messageChars: 1200,
  /** A conversation has no message limit, but this many customer messages inside the window means a short wait. */
  burstMessages: 12,
  burstWindowMs: 60 * 1000,
  /** Reference images per conversation. */
  images: 20,
  /** Images that can ride on one message. */
  imagesPerMessage: 6,
  /** An open conversation with no activity for this long is treated as abandoned. */
  idleMs: 3 * 60 * 60 * 1000,
  /** An open conversation silent for this long counts as gone quiet, and the owner is told once. */
  quietMs: 30 * 60 * 1000,
  /** After a conversation is resolved, the same visitor waits this long for another. */
  cooldownMs: 60 * 60 * 1000,
  /** Conversations that ended before this moment no longer hold anyone on cooldown: a one-off reset. */
  cooldownResetAt: "2026-10-13T08:53:00Z",
  /** Model replies are capped, which also caps cost per turn. */
  maxOutputTokens: 4000,
  /** The assistant may only ask "is that everything?" from this customer message on, so it digs first. */
  minTurnsToConfirm: 5,
  /** A conversation that has cost this much (USD) is wrapped up, a brake against a runaway chat. Normal ones cost a few cents. */
  maxCostUsd: 0.25,
} as const;

/** Per-frame pricing. The customer starts at LIST and can only be moved down one rung at a time. */
export const CHAT_PRICE = {
  list: 60,
  floor: 30,
  ladder: [60, 54, 48, 42, 36, 30],
  /** Customer messages that must pass between two concessions, so the agent stays firm. */
  turnsBetweenConcessions: 2,
  /** Matching an existing look (a game’s UI, a reference) is priced per task, separately from original design. */
  style: { list: 150, floor: 120, ladder: [150, 142, 135, 128, 120] },
} as const;
