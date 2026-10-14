import { getPublicWorks, readDb, writeDb } from "@/lib/db";
import { canFollowUp, sendFollowUp, type FollowUp } from "@/lib/discordNotify";
import { discordHandleIn } from "@/lib/quoteLimits";

import { markFollowedUp } from "./store";
import type { ChatThread } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FOLLOW_UP = {
  /** A lead hears nothing until this long after their brief or quote request. */
  afterMs: 7 * DAY_MS,
  /** Leads older than this are left alone, so nobody is messaged about something long past. */
  untilMs: 30 * DAY_MS,
  /** Most leads handled in one sweep; the rest wait for the next. */
  perSweep: 20,
  /** No new call is started after this long, so the sweep finishes inside its time limit. */
  budgetMs: 25_000,
} as const;

type Lead = Omit<FollowUp, "work"> & { at: string; mark: (at: string) => Promise<unknown> };

/**
 * Shows the newest work, once, to people who finished a brief or sent a quote request a week ago
 * and gave a Discord handle. Each lead is marked before the call, so it is never tried twice
 * whatever the answer. Never throws: this must not fail the rest of the sweep.
 */
export async function sendFollowUps(threads: ChatThread[], now = Date.now()): Promise<number> {
  let sent = 0;
  try {
    if (!canFollowUp()) return 0;
    const due = (at: string) => {
      const age = now - Date.parse(at);
      return age >= FOLLOW_UP.afterMs && age <= FOLLOW_UP.untilMs;
    };

    const leads: Lead[] = [];
    for (const thread of threads) {
      const at = thread.resolvedAt ?? thread.updatedAt;
      if (thread.status !== "resolved" || thread.followupAt || !due(at)) continue;
      const discord = discordHandleIn(thread.brief.contact);
      if (!discord) continue;
      leads.push({
        key: `brief:${thread.id}`,
        discord,
        name: thread.brief.name,
        about: thread.brief.project,
        at,
        mark: (when) => markFollowedUp(thread.id, when),
      });
    }
    for (const quote of (await readDb()).quotes) {
      if (!quote.discord || quote.followupAt || !due(quote.createdAt)) continue;
      leads.push({
        key: `quote:${quote.id}`,
        discord: quote.discord,
        name: quote.name,
        about: quote.service,
        at: quote.createdAt,
        mark: (when) =>
          writeDb((db) => {
            const stored = db.quotes.find((existing) => existing.id === quote.id);
            if (stored) stored.followupAt = when;
          }),
      });
    }
    if (!leads.length) return 0;

    const work = (await getPublicWorks()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!work) return 0;

    const stopAt = Date.now() + FOLLOW_UP.budgetMs;
    // Oldest first, so nobody ages out while newer leads go ahead of them.
    for (const lead of leads.sort((a, b) => a.at.localeCompare(b.at)).slice(0, FOLLOW_UP.perSweep)) {
      if (Date.now() > stopAt) break;
      await lead.mark(new Date().toISOString());
      if (await sendFollowUp({ key: lead.key, discord: lead.discord, name: lead.name, about: lead.about, work })) sent += 1;
    }
  } catch (err) {
    console.error("Discord follow-ups failed:", err);
  }
  return sent;
}
