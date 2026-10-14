import { createHash } from "node:crypto";

import { SITE } from "@/lib/site";
import type { Media, Work } from "@/types/portfolio";
import { workPieces, xPosts } from "@/lib/work";

/**
 * The Discord subscription service is a separate deployment (the virgue-discord repo). This site
 * only links to it and tells it when a work is published. Without its address, both are off.
 */
export const discordNotifyUrl = () => (process.env.DISCORD_NOTIFY_URL ?? "").trim().replace(/\/+$/, "") || null;

/** Where visitors subscribe, or null when the service is not connected. */
export const discordSubscribeUrl = () => {
  const base = discordNotifyUrl();
  return base ? `${base}/api/subscribe` : null;
};

const announceSecret = () => (process.env.DISCORD_ANNOUNCE_SECRET ?? "").trim();
const absolute = (src: string) => (src.startsWith("http") ? src : `${SITE.url}${src}`);
const coverOf = (pieces: Media[]) => pieces.find((piece) => piece.kind === "image" && piece.src)?.src;

type Announcement = { key: string; title: string; description?: string; pieces: Media[] };

/** Sends one announcement about a work. Never throws: a failed announcement must not fail a save. */
async function announce(work: Work, { key, title, description, pieces }: Announcement): Promise<void> {
  const base = discordNotifyUrl();
  const secret = announceSecret();
  if (!base || !secret || !work.published) return;

  const cover = coverOf(pieces);
  const x = xPosts(pieces).slice(0, 3);
  try {
    const res = await fetch(`${base}/api/announce`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        key,
        title,
        url: `${SITE.url}/work/${work.slug}`,
        description: description || undefined,
        image: cover ? absolute(cover) : undefined,
        // With an X post attached, subscribers are sent that post in place of the usual message.
        x: x.length ? x : undefined,
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) console.error(`Discord announcement for ${work.slug} failed: ${res.status}`);
  } catch (error) {
    console.error(`Discord announcement for ${work.slug} failed:`, error);
  }
}

/** Tells subscribers about a newly published work. The service sends each work once. */
export const announceWork = (work: Work) =>
  announce(work, { key: `work:${work.id}`, title: work.title, description: work.summary, pieces: workPieces(work) });

/**
 * Tells subscribers that pieces were added to a work that was already public: one message for
 * everything a save added. The key is made of the new files, so the same pieces are never sent twice.
 */
export function announcePieces(work: Work, added: Media[]): Promise<void> {
  if (!added.length) return Promise.resolve();
  const files = added.map((piece) => piece.src).sort().join("|");
  return announce(work, {
    key: `pieces:${work.id}:${createHash("sha256").update(files).digest("hex").slice(0, 24)}`,
    title: `New in ${work.title}`,
    description: added.length === 1 ? "One new piece was added." : `${added.length} new pieces were added.`,
    pieces: added,
  });
}

/** True when the service can be asked to message someone. */
export const canFollowUp = () => Boolean(discordNotifyUrl() && announceSecret());

export type FollowUp = {
  /** Unique per brief or quote. The service sends each key once. */
  key: string;
  /** The Discord username or id the customer gave. */
  discord: string;
  name?: string;
  /** One short line on what they asked for. */
  about?: string;
  work: Work;
};

/**
 * Asks the service to show one past lead the newest work. It only messages people who are
 * subscribed, so "not sent" is the usual answer and not a failure. Never throws.
 */
export async function sendFollowUp({ key, discord, name, about, work }: FollowUp): Promise<boolean> {
  const base = discordNotifyUrl();
  const secret = announceSecret();
  if (!base || !secret) return false;

  const cover = coverOf(workPieces(work));
  const image = cover ? absolute(cover) : "";
  try {
    const res = await fetch(`${base}/api/followup`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        key,
        discord,
        name: name || undefined,
        about: about ? about.slice(0, 200) : undefined,
        work: {
          title: work.title,
          url: `${SITE.url}/work/${work.slug}`,
          image: image.startsWith("https://") ? image : undefined,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`Discord follow-up ${key} failed: ${res.status}`);
      return false;
    }
    return ((await res.json().catch(() => null)) as { sent?: boolean } | null)?.sent === true;
  } catch (error) {
    console.error(`Discord follow-up ${key} failed:`, error);
    return false;
  }
}
