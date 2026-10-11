import type { Media } from "@/types/portfolio";

/** A piece as edited in the form: the stored media plus upload bookkeeping. */
export type PieceDraft = {
  key: string;
  kind: "image" | "video";
  srcType: "upload" | "url";
  src: string;
  poster: string;
  alt: string;
  focusX: number;
  focusY: number;
  status: "ready" | "uploading" | "error";
  progress: number;
  error?: string;
  /** Object URL of the chosen file while it uploads. */
  preview?: string;
};

let nextKey = 0;
export const newPieceKey = () => `piece-${nextKey++}`;

export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
];
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(",");

const VIDEO_EXTENSION = /\.(?:mp4|webm|mov|m4v)(?:$|[?#])/i;

export const guessKind = (src: string): PieceDraft["kind"] => (VIDEO_EXTENSION.test(src) ? "video" : "image");

export const isGif = (piece: Pick<PieceDraft, "kind" | "src">) =>
  piece.kind === "image" && /\.gif(?:$|[?#])/i.test(piece.src);

export function emptyDraft(overrides: Partial<PieceDraft> = {}): PieceDraft {
  return {
    key: newPieceKey(),
    kind: "image",
    srcType: "upload",
    src: "",
    poster: "",
    alt: "",
    focusX: 50,
    focusY: 50,
    status: "ready",
    progress: 0,
    ...overrides,
  };
}

export function draftFromMedia(media: Media): PieceDraft {
  return emptyDraft({
    kind: media.kind,
    srcType: media.srcType,
    src: media.src,
    poster: media.poster ?? "",
    alt: media.alt ?? "",
    focusX: media.focus?.x ?? 50,
    focusY: media.focus?.y ?? 50,
  });
}

export function mediaFromDraft(piece: PieceDraft): Media {
  return {
    kind: piece.kind,
    srcType: piece.srcType,
    src: piece.src.trim(),
    poster: piece.kind === "video" && piece.poster.trim() ? piece.poster.trim() : undefined,
    focus: { x: Math.round(piece.focusX), y: Math.round(piece.focusY) },
    alt: piece.alt.trim(),
  };
}

/** Something the browser can actually load: an absolute URL or a path on this site. */
export const looksLikeSource = (value: string) => /^(?:https?:\/\/|\/(?!\/))/i.test(value.trim());
