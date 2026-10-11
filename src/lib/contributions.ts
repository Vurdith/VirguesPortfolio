/**
 * Roblox games I've contributed to. Add a game by adding its place id (the number in the game's
 * URL: roblox.com/games/<placeId>/...) and whether it's released. Stats and thumbnails are
 * fetched live from Roblox's public APIs and cached for an hour.
 *
 * Roblox does not publish peak player counts through any public API, only the number playing
 * right now. Set `peak` (all-time peak concurrent players, e.g. from the creator dashboard or a
 * tracker such as RoMonitor) and the card shows it instead of the live count.
 */
export type ContributionStatus = "released" | "unreleased";

type ContributionConfig = {
  placeId: number;
  /** Shown if Roblox can't be reached. */
  name: string;
  status: ContributionStatus;
  /** Optional, entered by hand: all-time peak concurrent players. */
  peak?: number;
};

const CONTRIBUTIONS: readonly ContributionConfig[] = [
  { placeId: 14067600077, name: "TYPE://SOUL", status: "released" },
  { placeId: 10366978580, name: "Xeno Online 2: Legacy Mode", status: "released" },
  { placeId: 13379208636, name: "Attack on Titan Revolution", status: "released" },
  { placeId: 131079272918660, name: "Devil Hunter", status: "released" },
  { placeId: 7390824960, name: "FIRE FORCE ONLINE", status: "released" },
];

export type Contribution = {
  placeId: number;
  name: string;
  status: ContributionStatus;
  url: string;
  /** null when Roblox could not be reached for this game. */
  visits: number | null;
  playing: number | null;
  favorites: number | null;
  peak: number | null;
  /** Year the game was created. */
  year: number | null;
  thumbnail: string | null;
};

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Store names carry promo tags like "[UPDATE]" or "[KNIGHT KING]"; drop them. */
const cleanName = (name: string) => name.replace(/^(\s*\[[^\]]*\]\s*)+/, "").trim() || name;

type GameRow = {
  id: number;
  name: string;
  playing: number;
  visits: number;
  favoritedCount: number;
  created: string;
};
type ThumbRow = { universeId: number; thumbnails?: { imageUrl?: string; state?: string }[] };

export async function getContributions(): Promise<Contribution[]> {
  const universes = await Promise.all(
    CONTRIBUTIONS.map(async (item) => {
      const data = await getJson<{ universeId?: number }>(
        `https://apis.roblox.com/universes/v1/places/${item.placeId}/universe`,
        DAY,
      );
      return data?.universeId ?? null;
    }),
  );

  const ids = universes.filter((id): id is number => id !== null);
  const [games, thumbs] = ids.length
    ? await Promise.all([
        getJson<{ data?: GameRow[] }>(`https://games.roblox.com/v1/games?universeIds=${ids.join(",")}`, HOUR),
        getJson<{ data?: ThumbRow[] }>(
          `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${ids.join(",")}&countPerUniverse=1&size=768x432&format=Webp&isCircular=false`,
          HOUR,
        ),
      ])
    : [null, null];

  const result = CONTRIBUTIONS.map((item, index): Contribution => {
    const universeId = universes[index];
    const game = games?.data?.find((row) => row.id === universeId);
    const thumb = thumbs?.data?.find((row) => row.universeId === universeId)?.thumbnails?.[0];
    const created = game ? new Date(game.created).getFullYear() : null;

    return {
      placeId: item.placeId,
      name: game ? cleanName(game.name) : item.name,
      status: item.status,
      url: `https://www.roblox.com/games/${item.placeId}`,
      visits: game?.visits ?? null,
      playing: game?.playing ?? null,
      favorites: game?.favoritedCount ?? null,
      peak: item.peak ?? null,
      year: created && Number.isFinite(created) ? created : null,
      thumbnail: thumb?.state === "Completed" && thumb.imageUrl ? thumb.imageUrl : null,
    };
  });

  // Biggest games first; games without stats keep their listed order at the end.
  return result
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (b.item.visits ?? -1) - (a.item.visits ?? -1) || a.index - b.index)
    .map(({ item }) => item);
}
