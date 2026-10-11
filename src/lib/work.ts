import type { Media, Work } from "@/types/portfolio";

export const MAX_PIECES = 12;

type WithPieces = { media: Media; items?: Media[] };

/** Every piece of a work in display order; works without `items` are a single piece. */
export function workPieces(work: WithPieces): Media[] {
  return work.items?.length ? work.items : [work.media];
}

/**
 * Keeps `media` equal to the first piece and stores `items` only for real collections, so
 * single-piece works keep the exact shape they always had.
 */
export function normalizePieces<T extends WithPieces>(work: T): T {
  const { items, ...rest } = work;
  if (!items?.length) return rest as T;
  return (items.length > 1 ? { ...rest, media: items[0], items } : { ...rest, media: items[0] }) as T;
}

/** Applies a partial update to a stored work, keeping the cover and the pieces consistent. */
export function mergeWork(stored: Work, patch: Partial<Work>): Work {
  const merged = { ...stored, ...patch };
  if (patch.media && !patch.items && stored.items) {
    merged.items = [patch.media, ...stored.items.slice(1)];
  }
  return normalizePieces(merged);
}

export function missingPieceIndex(work: WithPieces): number {
  return workPieces(work).findIndex((piece) => !piece.src.trim());
}
