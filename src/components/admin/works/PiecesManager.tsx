"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { optimizedImage } from "@/lib/images";
import { MAX_PIECES } from "@/lib/work";

import { uploadFile } from "./upload";
import {
  ACCEPTED_TYPES,
  ACCEPT_ATTRIBUTE,
  emptyDraft,
  guessKind,
  isGif,
  looksLikeSource,
  type PieceDraft,
} from "./pieces";

const INPUT =
  "w-full rounded-xl border border-line/10 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40 transition-colors duration-200 hover:border-line/25 focus:border-line/40";
const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line/20 bg-void/40 px-4 py-2 text-[11px] tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-200 hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";
const ICON_BUTTON =
  "inline-flex size-7 items-center justify-center rounded-full border border-line/10 bg-void/40 text-[11px] leading-none text-fog/70 transition-colors duration-200 hover:border-line/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line/10 disabled:hover:text-fog/70";

type SetPieces = React.Dispatch<React.SetStateAction<PieceDraft[]>>;

const pad = (n: number) => String(n).padStart(2, "0");

function kindLabel(piece: PieceDraft) {
  if (piece.kind === "video") return "VIDEO";
  return isGif(piece) ? "GIF" : "IMAGE";
}

/**
 * Manages the pieces of a work: add files or URLs, drag or use the arrows to reorder, and edit
 * the selected piece below. The first piece is the cover.
 */
export function PiecesManager({
  pieces,
  setPieces,
  errors,
}: {
  pieces: PieceDraft[];
  setPieces: SetPieces;
  /** Problems by piece key, shown on the tile and in the editor. */
  errors: Record<string, string>;
}) {
  const [selectedKey, setSelectedKey] = React.useState<string | null>(pieces[0]?.key ?? null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);
  const [fileDrag, setFileDrag] = React.useState(false);
  const [urlOpen, setUrlOpen] = React.useState(false);
  const [urlValue, setUrlValue] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const fileInput = React.useRef<HTMLInputElement>(null);
  const jobs = React.useRef(new Map<string, { file: File; preview: string }>());

  React.useEffect(() => {
    const pending = jobs.current;
    return () => pending.forEach((job) => URL.revokeObjectURL(job.preview));
  }, []);

  const selected = pieces.find((piece) => piece.key === selectedKey) ?? pieces[0] ?? null;
  const full = pieces.length >= MAX_PIECES;

  const patch = React.useCallback(
    (key: string, next: Partial<PieceDraft>) =>
      setPieces((list) => list.map((piece) => (piece.key === key ? { ...piece, ...next } : piece))),
    [setPieces],
  );

  const runUpload = React.useCallback(
    async (key: string) => {
      const job = jobs.current.get(key);
      if (!job) return;
      patch(key, { status: "uploading", progress: 0, error: undefined, preview: job.preview });
      try {
        const kind = job.file.type.startsWith("video/") ? "video" : "image";
        const path = await uploadFile(job.file, kind, (fraction) => patch(key, { progress: fraction }));
        URL.revokeObjectURL(job.preview);
        jobs.current.delete(key);
        patch(key, { src: path, srcType: "upload", status: "ready", progress: 1, preview: undefined });
      } catch (error) {
        patch(key, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    },
    [patch],
  );

  const uploadAll = React.useCallback(
    async (keys: string[]) => {
      let cursor = 0;
      const worker = async () => {
        while (cursor < keys.length) await runUpload(keys[cursor++]);
      };
      await Promise.all([worker(), worker()]);
    },
    [runUpload],
  );

  const addFiles = (incoming: File[]) => {
    const supported = incoming.filter((file) => ACCEPTED_TYPES.includes(file.type));
    const room = MAX_PIECES - pieces.length;
    const accepted = supported.slice(0, Math.max(room, 0));

    const skipped = incoming.length - accepted.length;
    setNotice(
      skipped > 0
        ? incoming.length - supported.length > 0
          ? `${skipped} file${skipped === 1 ? "" : "s"} skipped: only JPG, PNG, WEBP, GIF, MP4 and WEBM fit, up to ${MAX_PIECES} pieces.`
          : `Only ${MAX_PIECES} pieces fit; ${skipped} file${skipped === 1 ? "" : "s"} skipped.`
        : null,
    );
    if (!accepted.length) return;

    const drafts = accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      const draft = emptyDraft({
        kind: file.type.startsWith("video/") ? "video" : "image",
        status: "uploading",
        preview,
      });
      jobs.current.set(draft.key, { file, preview });
      return draft;
    });

    setPieces((list) => [...list, ...drafts]);
    setSelectedKey(drafts[0].key);
    void uploadAll(drafts.map((draft) => draft.key));
  };

  const replaceFile = (key: string, file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setNotice("That file type is not supported.");
      return;
    }
    setNotice(null);
    const previous = jobs.current.get(key);
    if (previous) URL.revokeObjectURL(previous.preview);
    jobs.current.set(key, { file, preview: URL.createObjectURL(file) });
    patch(key, { kind: file.type.startsWith("video/") ? "video" : "image" });
    void runUpload(key);
  };

  const addUrl = () => {
    const value = urlValue.trim();
    if (!looksLikeSource(value)) {
      setUrlError("Enter a full https:// link or a path starting with /.");
      return;
    }
    const draft = emptyDraft({ srcType: "url", src: value, kind: guessKind(value) });
    setPieces((list) => [...list, draft]);
    setSelectedKey(draft.key);
    setUrlValue("");
    setUrlError(null);
    // Stays open so several links can be added in a row.
    if (pieces.length + 1 >= MAX_PIECES) setUrlOpen(false);
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= pieces.length) return;
    setPieces((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (key: string) => {
    const index = pieces.findIndex((piece) => piece.key === key);
    const job = jobs.current.get(key);
    if (job) URL.revokeObjectURL(job.preview);
    jobs.current.delete(key);
    const neighbour = pieces[index + 1] ?? pieces[index - 1];
    setPieces((list) => list.filter((piece) => piece.key !== key));
    if (selectedKey === key) setSelectedKey(neighbour?.key ?? null);
  };

  const onTileDrop = (targetKey: string) => {
    const from = pieces.findIndex((piece) => piece.key === dragKey);
    const to = pieces.findIndex((piece) => piece.key === targetKey);
    setDragKey(null);
    setOverKey(null);
    if (from !== -1 && to !== -1) move(from, to);
  };

  const selectedIndex = selected ? pieces.findIndex((piece) => piece.key === selected.key) : -1;

  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setFileDrag(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileDrag(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setFileDrag(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "relative transition-colors duration-200",
        fileDrag && "outline outline-1 outline-offset-8 outline-line/40",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] tracking-[0.22em] text-fog/70" aria-live="polite">
          <span className="text-ink">{pad(pieces.length)}</span> / {pad(MAX_PIECES)} PIECES
          {pieces.length > 1 ? <span className="text-fog/50"> · COLLECTION</span> : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={full} onClick={() => fileInput.current?.click()} className={BUTTON}>
            + ADD FILES
          </button>
          <button
            type="button"
            disabled={full}
            aria-expanded={urlOpen}
            onClick={() => setUrlOpen((open) => !open)}
            className={BUTTON}
          >
            + ADD URL
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose image, GIF or video files"
            data-testid="piece-file-input"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {urlOpen ? (
          <motion.div
            key="url"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={urlValue}
                onChange={(event) => {
                  setUrlValue(event.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addUrl();
                }}
                aria-label="Image, GIF or video URL"
                aria-invalid={Boolean(urlError)}
                placeholder="https://…/shot.png, .gif, .mp4 or .webm"
                className={INPUT}
                autoFocus
              />
              <button type="button" onClick={addUrl} className={cn(BUTTON, "sm:shrink-0")}>
                ADD PIECE
              </button>
            </div>
            {urlError ? <p className="mt-2 text-xs text-red-300/90">{urlError}</p> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {notice ? (
        <p role="status" className="mt-4 text-xs text-fog/80">
          {notice}
        </p>
      ) : null}

      {pieces.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mt-5 flex h-44 w-full flex-col items-center justify-center gap-2 border border-dashed border-line/20 bg-void/20 text-center transition-colors duration-200 hover:border-line/40 hover:bg-white/[0.02]"
        >
          <span className="text-xs tracking-[0.22em] text-ink">DROP FILES HERE OR CLICK TO BROWSE</span>
          <span className="text-[11px] tracking-[0.18em] text-fog/60">
            JPG · PNG · WEBP · GIF · MP4 · WEBM · UP TO {MAX_PIECES} PIECES
          </span>
        </button>
      ) : (
        <ul
          aria-label="Pieces"
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        >
          <AnimatePresence initial={false}>
            {pieces.map((piece, index) => (
              <motion.li
                key={piece.key}
                layout="position"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: dragKey === piece.key ? 0.4 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  draggable
                  onDragStart={() => setDragKey(piece.key)}
                  onDragOver={(event) => {
                    if (!dragKey) return;
                    event.preventDefault();
                    setOverKey(piece.key);
                  }}
                  onDrop={(event) => {
                    if (!dragKey) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onTileDrop(piece.key);
                  }}
                  onDragEnd={() => {
                    setDragKey(null);
                    setOverKey(null);
                  }}
                  className={cn(
                    "relative",
                    overKey === piece.key &&
                      dragKey !== piece.key &&
                      "outline outline-1 outline-offset-4 outline-line/50",
                  )}
                >
                  <Tile
                    piece={piece}
                    index={index}
                    selected={selected?.key === piece.key}
                    error={errors[piece.key]}
                    onSelect={() => setSelectedKey(piece.key)}
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Move piece ${index + 1} earlier`}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        className={ICON_BUTTON}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        aria-label={`Move piece ${index + 1} later`}
                        disabled={index === pieces.length - 1}
                        onClick={() => move(index, index + 1)}
                        className={ICON_BUTTON}
                      >
                        ▶
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove piece ${index + 1}`}
                      onClick={() => remove(piece.key)}
                      className={ICON_BUTTON}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {selected ? (
        <PieceEditor
          key={selected.key}
          piece={selected}
          index={selectedIndex}
          count={pieces.length}
          error={errors[selected.key]}
          onPatch={(next) => patch(selected.key, next)}
          onReplace={(file) => replaceFile(selected.key, file)}
          onRetry={() => void runUpload(selected.key)}
          onMakeCover={() => {
            move(selectedIndex, 0);
          }}
        />
      ) : null}
    </div>
  );
}

function Tile({
  piece,
  index,
  selected,
  error,
  onSelect,
}: {
  piece: PieceDraft;
  index: number;
  selected: boolean;
  error?: string;
  onSelect: () => void;
}) {
  const failed = piece.status === "error";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Piece ${index + 1}${index === 0 ? ", cover" : ""}, ${kindLabel(piece).toLowerCase()}${failed ? ", upload failed" : piece.status === "uploading" ? ", uploading" : ""}. Select to edit.`}
      className={cn(
        "group relative block aspect-[4/5] w-full cursor-grab overflow-hidden border bg-void/40 transition-[border-color,box-shadow] duration-200 active:cursor-grabbing",
        selected
          ? "border-line/60 shadow-[0_0_0_1px_rgb(255_255_255/0.25)]"
          : "border-line/10 hover:border-line/30",
        (failed || error) && !selected && "border-red-300/50",
      )}
    >
      <PieceThumb piece={piece} className="absolute inset-0 h-full w-full object-cover" />
      <span
        className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/70 to-transparent"
        aria-hidden="true"
      />
      <span className="absolute left-2 top-1.5 text-[11px] tracking-[0.22em] text-ink">{pad(index + 1)}</span>
      {index === 0 ? (
        <span className="absolute right-1.5 top-1.5 rounded-md border border-line/30 bg-void/80 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-ink">
          COVER
        </span>
      ) : null}
      <span className="absolute bottom-1.5 left-1.5 rounded-md border border-line/20 bg-void/80 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-fog/80">
        {kindLabel(piece)}
      </span>

      {piece.status === "uploading" ? (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/10" aria-hidden="true">
          <span
            className="block h-full origin-left bg-white/80 transition-transform duration-200"
            style={{ transform: `scaleX(${Math.max(piece.progress, 0.04)})` }}
          />
        </span>
      ) : null}
      {piece.status === "uploading" ? (
        <span className="absolute bottom-1.5 right-1.5 text-[10px] tracking-[0.2em] text-ink">
          {Math.round(piece.progress * 100)}%
        </span>
      ) : null}
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-[11px] tracking-[0.22em] text-red-300">
          FAILED
        </span>
      ) : null}
      {!failed && !piece.src && piece.status === "ready" ? (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.22em] text-fog/60">
          NO FILE
        </span>
      ) : null}
    </button>
  );
}

function PieceThumb({ piece, className }: { piece: PieceDraft; className?: string }) {
  const source = piece.src || piece.preview || "";

  if (piece.kind === "video") {
    if (piece.poster) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={optimizedImage(piece.poster, 384)} alt="" draggable={false} className={className} />;
    }
    return source ? (
      <video
        src={`${source}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-hidden="true"
        className={className}
      />
    ) : null;
  }

  return source ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={optimizedImage(source, 384)} alt="" draggable={false} className={className} />
  ) : null;
}

function PieceEditor({
  piece,
  index,
  count,
  error,
  onPatch,
  onReplace,
  onRetry,
  onMakeCover,
}: {
  piece: PieceDraft;
  index: number;
  count: number;
  error?: string;
  onPatch: (next: Partial<PieceDraft>) => void;
  onReplace: (file: File | undefined) => void;
  onRetry: () => void;
  onMakeCover: () => void;
}) {
  const replaceInput = React.useRef<HTMLInputElement>(null);
  const posterInput = React.useRef<HTMLInputElement>(null);
  const [posterBusy, setPosterBusy] = React.useState(false);
  const [posterError, setPosterError] = React.useState<string | null>(null);
  const busy = piece.status === "uploading";

  const uploadPoster = async (file: File | undefined) => {
    if (!file) return;
    setPosterBusy(true);
    setPosterError(null);
    try {
      onPatch({ poster: await uploadFile(file, "poster") });
    } catch (e) {
      setPosterError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPosterBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6 rounded-2xl border border-line/10 bg-void/30 p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] tracking-[0.22em] text-fog/70">
          PIECE <span className="text-ink">{pad(index + 1)}</span> / {pad(count)}
          {index === 0 ? <span className="text-fog/50"> · COVER</span> : null}
        </h3>
        {index > 0 ? (
          <button type="button" onClick={onMakeCover} className={cn(BUTTON, "py-1.5")}>
            MAKE COVER
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          {piece.kind === "image" && (piece.src || piece.preview) ? (
            <FocusPicker
              src={piece.src || piece.preview || ""}
              x={piece.focusX}
              y={piece.focusY}
              onChange={(x, y) => onPatch({ focusX: x, focusY: y })}
            />
          ) : piece.kind === "video" && (piece.src || piece.preview) ? (
            <video
              key={piece.src || piece.preview}
              src={piece.src || piece.preview}
              poster={piece.poster || undefined}
              controls
              muted
              playsInline
              preload="metadata"
              className="max-h-56 max-w-full rounded-xl border border-line/10 bg-black"
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-xl border border-line/10 bg-void/25 text-[11px] tracking-[0.22em] text-fog/50">
              NO PREVIEW
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <span className="text-[11px] tracking-[0.22em] text-fog/70">SOURCE</span>
            {piece.srcType === "url" ? (
              <input
                value={piece.src}
                onChange={(event) =>
                  onPatch({ src: event.target.value, kind: guessKind(event.target.value) })
                }
                aria-label={`Piece ${index + 1} source URL`}
                aria-invalid={Boolean(error)}
                className={cn(INPUT, "mt-2", error && "border-red-300/50")}
                placeholder="https://…"
              />
            ) : (
              <p className="mt-2 break-all text-xs text-fog/80">{piece.src || (busy ? "Uploading…" : "—")}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => replaceInput.current?.click()}
                className={BUTTON}
              >
                {piece.src ? "REPLACE FILE" : "UPLOAD FILE"}
              </button>
              {piece.status === "error" ? (
                <button type="button" onClick={onRetry} className={BUTTON}>
                  RETRY
                </button>
              ) : null}
              <input
                ref={replaceInput}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                className="sr-only"
                tabIndex={-1}
                aria-label={`Replace piece ${index + 1} file`}
                onChange={(event) => {
                  onReplace(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            {busy ? (
              <div
                className="mt-3 h-1 w-full bg-white/10"
                role="progressbar"
                aria-label="Upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(piece.progress * 100)}
              >
                <div
                  className="h-full origin-left bg-white/80 transition-transform duration-200"
                  style={{ transform: `scaleX(${Math.max(piece.progress, 0.03)})` }}
                />
              </div>
            ) : null}
            {piece.error ? <p className="mt-2 text-xs text-red-300/90">{piece.error}</p> : null}
            {error && !piece.error ? <p className="mt-2 text-xs text-red-300/90">{error}</p> : null}
          </div>

          <label className="block">
            <span className="text-[11px] tracking-[0.22em] text-fog/70">TYPE</span>
            <select
              value={piece.kind}
              onChange={(event) => onPatch({ kind: event.target.value as PieceDraft["kind"] })}
              className="mt-2 block w-full rounded-xl border border-line/10 bg-void/35 px-3 py-2.5 text-xs tracking-[0.22em] text-fog/80"
            >
              <option value="image">IMAGE / GIF</option>
              <option value="video">VIDEO</option>
            </select>
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between text-[11px] tracking-[0.22em] text-fog/70">
              <span>ALT TEXT</span>
              <span className="text-fog/50">{piece.alt.length}/200</span>
            </span>
            <input
              value={piece.alt}
              onChange={(event) => onPatch({ alt: event.target.value })}
              maxLength={200}
              className={cn(INPUT, "mt-2")}
              placeholder="Describe this piece for screen readers"
            />
          </label>

          {piece.kind === "video" ? (
            <div>
              <span className="text-[11px] tracking-[0.22em] text-fog/70">POSTER (OPTIONAL)</span>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={piece.poster}
                  onChange={(event) => onPatch({ poster: event.target.value })}
                  aria-label={`Piece ${index + 1} poster URL`}
                  className={INPUT}
                  placeholder="Poster image URL"
                />
                <button
                  type="button"
                  disabled={posterBusy}
                  onClick={() => posterInput.current?.click()}
                  className={cn(BUTTON, "sm:shrink-0")}
                >
                  {posterBusy ? "UPLOADING" : "UPLOAD"}
                </button>
                <input
                  ref={posterInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label={`Upload piece ${index + 1} poster`}
                  onChange={(event) => {
                    void uploadPoster(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
              {posterError ? <p className="mt-2 text-xs text-red-300/90">{posterError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Click the image to choose the focal point. The thumbnails show how it crops into the gallery
 * card (4:5) and a wide strip, so you can see what a crop keeps before saving.
 */
function FocusPicker({
  src,
  x,
  y,
  onChange,
}: {
  src: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onChange(
      clamp(((event.clientX - rect.left) / rect.width) * 100),
      clamp(((event.clientY - rect.top) / rect.height) * 100),
    );
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    onChange(clamp(x + move[0]), clamp(y + move[1]));
  };

  const thumb = (aspect: string, width: string) => (
    <div
      className={cn("shrink-0 rounded-xl border border-line/10 bg-void/40 bg-cover", aspect, width)}
      style={{ backgroundImage: `url(${src})`, backgroundPosition: `${x}% ${y}%` }}
    />
  );

  return (
    <div>
      <div
        role="slider"
        aria-label="Focal point"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(x)}
        aria-valuetext={`${Math.round(x)}% across, ${Math.round(y)}% down`}
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons) pick(event);
        }}
        onKeyDown={onKeyDown}
        className="relative inline-block max-w-full cursor-crosshair touch-none rounded-xl border border-line/10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" draggable={false} className="block max-h-56 max-w-full select-none" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      </div>
      <div className="mt-3 flex items-end gap-3">
        {thumb("aspect-[4/5]", "w-16")}
        {thumb("aspect-[16/6]", "w-32")}
        <span className="text-[11px] tracking-[0.22em] text-fog/70">FOCAL POINT · CLICK OR USE ARROWS</span>
      </div>
    </div>
  );
}
