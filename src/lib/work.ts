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

/** A link to one post on X (or its old twitter.com address). */
export const X_POST_PATTERN = /^https:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{5,25}(?:[/?#].*)?$/;

/**
 * The pieces a save added to a work, judged by their files. Empty unless the work grew: swapping
 * a piece's file, reordering and removing are edits, not news.
 */
export function addedPieces(before: WithPieces, after: WithPieces): Media[] {
  const had = new Set(workPieces(before).map((piece) => piece.src));
  const now = workPieces(after);
  if (now.length <= had.size) return [];
  return now.filter((piece) => piece.src && !had.has(piece.src));
}

/** The X posts attached to these pieces, each once, in order. */
export function xPosts(pieces: Media[]): string[] {
  return [...new Set(pieces.map((piece) => piece.xUrl?.trim() ?? "").filter((url) => X_POST_PATTERN.test(url)))];
}

export function missingPieceIndex(work: WithPieces): number {
  return workPieces(work).findIndex((piece) => !piece.src.trim());
}
