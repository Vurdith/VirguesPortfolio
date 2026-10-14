import { canFollowUp } from "@/lib/discordNotify";
import { discordHandleIn } from "@/lib/quoteLimits";

import { chatImageUrl } from "./images";
import type { Usage } from "./model";
import type { ChatBrief, ChatReward, ChatStatus, ChatSteer, ChatThread } from "./types";
import type { QuoteStatus } from "@/types/portfolio";

/** A conversation as the admin pages see it: no hashes, images resolved to addresses. */
export type AdminBrief = {
  id: string;
  status: ChatStatus;
  handled: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  endReason?: string;
  brief: ChatBrief;
  offer: number;
  styleOffer: number;
  userTurns: number;
  costUsd: number;
  usage?: Usage;
  /** The summary was written before the latest messages, so it is out of date. */
  summaryStale: boolean;
  /** The owner is replying personally and the assistant is paused. */
  takeover: boolean;
  steer: ChatSteer[];
  /** The assistant is writing a reply right now. */
  working: boolean;
  /** Why the assistant last failed to reply, if it did. */
  lastError?: { at: string; message: string };
  /** The reward code on the quote, if the customer gave a good one. */
  reward?: ChatReward;
  /** Whether the client got points for paying, once the owner has said they paid. */
  paid?: ChatThread["paid"];
  /** The contact names a Discord account the bot can give points to. */
  canPay: boolean;
  images: { id: string; url: string }[];
  messages: {
    id: string;
    role: "user" | "assistant";
    owner: boolean;
    content: string;
    images: { id: string; url: string }[];
    at: string;
  }[];
};

export function adminBrief(thread: ChatThread): AdminBrief {
  return {
    id: thread.id,
    status: thread.status,
    handled: thread.handled,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    ...(thread.endReason ? { endReason: thread.endReason } : {}),
    brief: thread.brief,
    offer: thread.offer,
    styleOffer: thread.styleOffer,
    userTurns: thread.userTurns,
    costUsd: thread.costUsd,
    ...(thread.usage ? { usage: thread.usage } : {}),
    summaryStale: Boolean(thread.brief.summary) && thread.summaryTurn !== thread.userTurns,
    takeover: Boolean(thread.takeover),
    steer: thread.steer ?? [],
    working: Boolean(thread.lockedUntil && Date.parse(thread.lockedUntil) > Date.now()),
    ...(thread.lastError ? { lastError: thread.lastError } : {}),
    ...(thread.reward ? { reward: thread.reward } : {}),
    ...(thread.paid ? { paid: thread.paid } : {}),
    canPay: canFollowUp() && Boolean(discordHandleIn(thread.brief.contact)),
    images: thread.uploads.map((id) => ({ id, url: chatImageUrl(id) })),
    messages: thread.messages.map((message) => ({
      id: message.id,
      role: message.role,
      owner: message.by === "owner",
      content: message.content,
      images: (message.images ?? []).map((id) => ({ id, url: chatImageUrl(id) })),
      at: message.at,
    })),
  };
}
