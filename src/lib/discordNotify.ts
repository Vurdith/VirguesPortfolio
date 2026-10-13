import { SITE } from "@/lib/site";
import type { Work } from "@/types/portfolio";
import { workPieces } from "@/lib/work";

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

/**
 * Tells subscribers about a newly published work. The service sends each work once, so calling this
 * again for the same work does nothing. Never throws: a failed announcement must not fail a save.
 */
export async function announceWork(work: Work): Promise<void> {
  const base = discordNotifyUrl();
  const secret = (process.env.DISCORD_ANNOUNCE_SECRET ?? "").trim();
  if (!base || !secret || !work.published) return;

  const cover = workPieces(work).find((piece) => piece.kind === "image" && piece.src)?.src;
  try {
    const res = await fetch(`${base}/api/announce`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        key: `work:${work.id}`,
        title: work.title,
        url: `${SITE.url}/work/${work.slug}`,
        description: work.summary || undefined,
        image: cover ? (cover.startsWith("http") ? cover : `${SITE.url}${cover}`) : undefined,
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) console.error(`Discord announcement for ${work.slug} failed: ${res.status}`);
  } catch (error) {
    console.error(`Discord announcement for ${work.slug} failed:`, error);
  }
}
