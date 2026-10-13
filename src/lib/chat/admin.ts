import { chatImageUrl } from "./images";
import type { ChatBrief, ChatStatus, ChatSteer, ChatThread } from "./types";
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
  /** The owner is replying personally and the assistant is paused. */
  takeover: boolean;
  steer: ChatSteer[];
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
    takeover: Boolean(thread.takeover),
    steer: thread.steer ?? [],
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
