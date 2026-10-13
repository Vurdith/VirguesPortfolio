import type { QuoteStatus } from "@/types/portfolio";

import type { Usage } from "./model";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  /** Set when the owner wrote it personally, rather than the assistant. */
  by?: "owner";
  content: string;
  /** The assistant's own turn as JSON, which is how the model is shown it afterwards. Never sent to the browser. */
  json?: string;
  /** Answers the customer can tap in reply to this message. */
  suggest?: string[];
  /** Payment buttons are shown under this message. */
  pay?: boolean;
  /** Ids of uploaded reference images. */
  images?: string[];
  at: string;
};

/** What the assistant has learned so far. Each turn adds what changed; `summary` is written when the chat ends. */
export type ChatBrief = {
  name: string;
  contact: string;
  project: string;
  platform: string;
  frames: number | null;
  /** The customer wants an existing look matched, which is priced per task rather than per frame. */
  styleReplication: boolean;
  screens: string[];
  style: string;
  references: string;
  deadline: string;
  /** What the customer says they can spend, in their words. Absent on conversations from before it existed. */
  budget?: string;
  extras: string;
  summary: string;
};

export const EMPTY_BRIEF: ChatBrief = {
  name: "",
  contact: "",
  project: "",
  platform: "",
  frames: null,
  styleReplication: false,
  screens: [],
  style: "",
  references: "",
  deadline: "",
  budget: "",
  extras: "",
  summary: "",
};

/**
 * open: still talking. resolved: the customer confirmed it is everything and it was sent on.
 * abandoned: went quiet, or hit a limit, before that. The owner still sees all of them.
 */
export type ChatStatus = "open" | "resolved" | "abandoned";

export type ChatSteer = { id: string; note: string; at: string };

export type ChatThread = {
  id: string;
  /** Salted hash of the visitor's IP. Never sent out. */
  ownerHash: string;
  /** Hash of the secret in the visitor's cookie. Never sent out. */
  tokenHash: string;
  status: ChatStatus;
  /** The owner's own follow-up state, same as quote requests. */
  handled: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  /** Why it ended without a confirmation, for the owner. */
  endReason?: string;
  messages: ChatMessage[];
  /** Images this visitor uploaded. Messages may only reference these. */
  uploads: string[];
  brief: ChatBrief;
  /** The assistant has asked "is that everything?" and is waiting for the answer. */
  awaitingConfirm: boolean;
  /** Price per frame currently on the table. */
  offer: number;
  /** Customer message number at which the price last came down (0 = never). */
  lastConcessionTurn: number;
  /** Price per task when matching an existing style, and when it last came down. */
  styleOffer: number;
  lastStyleConcessionTurn: number;
  userTurns: number;
  /** The owner has taken over: the assistant stays silent and the owner replies. */
  takeover?: boolean;
  /** Private guidance from the owner that the assistant follows on every reply. */
  steer?: ChatSteer[];
  /** Overlapping requests on one conversation are refused until this time. */
  lockedUntil?: string;
  /** The last time the assistant could not reply, and why. For the owner; cleared on the next success. */
  lastError?: { at: string; message: string };
  /** Customer message count when the handover summary was last written, so it is only redone when stale. */
  summaryTurn?: number;
  /** The owner has been emailed that the customer left contact details. */
  contactNotified?: boolean;
  /** The owner has been emailed about this conversation going quiet. */
  idleNotified?: boolean;
  /** Model spend, when the provider reports it. */
  costUsd: number;
  /** Tokens used, so the owner can see what the spend went on. */
  usage?: Usage;
};
