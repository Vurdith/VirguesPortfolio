"use client";

import * as React from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";

import type { Media, Work } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { usePageTransition } from "@/components/PageTransition";
import { cn } from "@/lib/cn";
import { optimizedImage } from "@/lib/images";
import { workPieces } from "@/lib/work";
import { useUiSounds } from "@/hooks/useUiSounds";

export function WorkViewer({ work }: { work: Work }) {
  const { navigate } = usePageTransition();
  const { playClose } = useUiSounds();

  const close = React.useCallback(() => {
    playClose();
    try {
      const ref = document.referrer;
      const canBack = ref && new URL(ref).origin === window.location.origin && window.history.length > 1;
      if (canBack) {
        navigate("back");
        return;
      }
    } catch {
      // ignore
    }

    navigate("/#work");
  }, [playClose, navigate]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <main id="main" tabIndex={-1} className="film-grain vignette outline-none min-h-dvh">
      <motion.button
        type="button"
        data-sound="off"
        onClick={close}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "fixed right-6 top-6 z-[90] inline-flex h-11 w-11 items-center justify-center border border-line/18 bg-void/40 text-fog/70 backdrop-blur-md",
          "hover:border-line/35 hover:text-ink",
        )}
        aria-label="Close"
      >
        <span className="text-xl leading-none">×</span>
        <CornerMarks className="opacity-80" />
      </motion.button>

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
        <div className="flex flex-1 items-center justify-center">
          <WorkMedia work={work} />
        </div>

        <WorkInfo work={work} />
      </div>
    </main>
  );
}

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 500;
/** The native video controls sit along the bottom edge; a drag that starts there is a scrub. */
const VIDEO_CONTROLS_HEIGHT = 56;

const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;

type SlideCustom = { dir: number; shift: number };

const slide = {
  enter: ({ dir, shift }: SlideCustom) => ({ opacity: 0, x: dir * shift }),
  center: { opacity: 1, x: 0 },
  exit: ({ dir, shift }: SlideCustom) => ({ opacity: 0, x: dir * -shift }),
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes(target.tagName);
}

/**
 * The work's media. Collections get a counter, previous/next buttons, a thumbnail strip, arrow-key
 * navigation and swipe/drag; `onPieceChange` reports the piece being shown.
 */
export function WorkMedia({ work, onPieceChange }: { work: Work; onPieceChange?: (piece: Media) => void }) {
  const pieces = React.useMemo(() => workPieces(work), [work]);
  const count = pieces.length;
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ index: 0, dir: 1 });
  const index = Math.min(position.index, count - 1);

  const changeRef = React.useRef(onPieceChange);
  React.useEffect(() => {
    changeRef.current = onPieceChange;
  });
  React.useEffect(() => {
    changeRef.current?.(pieces[index]);
  }, [pieces, index]);

  const goTo = React.useCallback(
    (next: number, dir: number) => {
      if (count < 2) return;
      // Leaving a piece stops its video; the old slide stays mounted while it fades out.
      stageRef.current?.querySelectorAll("video").forEach((video) => video.pause());
      setPosition({ index: (next + count) % count, dir });
    },
    [count],
  );
  const step = React.useCallback((delta: number) => goTo(index + delta, delta > 0 ? 1 : -1), [goTo, index]);

  React.useEffect(() => {
    if (count < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, step]);

  // Warm the neighbours so stepping through is instant.
  React.useEffect(() => {
    if (count < 2) return;
    for (const offset of [1, -1]) {
      const piece = pieces[(index + offset + count) % count];
      const src = piece.kind === "video" ? piece.poster : piece.src;
      if (src) new Image().src = src;
    }
  }, [pieces, index, count]);

  if (count < 2) {
    return <PieceView piece={pieces[0]} work={work} index={0} count={1} />;
  }

  const custom: SlideCustom = { dir: position.dir, shift: reduceMotion ? 0 : 48 };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${work.title}, ${count} pieces`}
      className="flex w-full flex-col items-center gap-5"
    >
      <div
        ref={stageRef}
        className="relative flex h-[min(78svh,820px)] w-full items-center justify-center overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false} custom={custom}>
          <motion.div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            custom={custom}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: SLIDE_EASE }}
            drag="x"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onPointerDown={(event) => {
              const target = event.target as HTMLElement;
              if (target.tagName === "VIDEO") {
                const rect = target.getBoundingClientRect();
                if (rect.bottom - event.clientY < VIDEO_CONTROLS_HEIGHT) return;
              }
              dragControls.start(event);
            }}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
                step(info.offset.x < 0 ? 1 : -1);
              }
            }}
            style={{ touchAction: "pan-y" }}
            className="flex size-full items-center justify-center"
          >
            <PieceView piece={pieces[index]} work={work} index={index} count={count} inStage />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-5">
        <StepButton label="Previous piece" direction="prev" onClick={() => step(-1)} />
        <p className="min-w-16 text-center text-xs tabular-nums tracking-[0.22em] text-ink">
          {index + 1} / {count}
        </p>
        <StepButton label="Next piece" direction="next" onClick={() => step(1)} />
      </div>

      <div
        role="group"
        aria-label="Choose a piece"
        className="flex max-w-full gap-2 overflow-x-auto px-1 pb-1"
      >
        {pieces.map((piece, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show piece ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => goTo(i, i > index ? 1 : -1)}
            className={cn(
              "relative h-12 w-10 shrink-0 overflow-hidden border bg-void/60 transition-[border-color,opacity] duration-200",
              i === index
                ? "border-line/70"
                : "border-line/15 opacity-60 hover:border-line/40 hover:opacity-100",
            )}
          >
            <Thumb piece={piece} />
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Piece {index + 1} of {count}
      </p>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: "prev" | "next";
}) {
  return (
    <button
      type="button"
      data-sound="off"
      aria-label={label}
      onClick={onClick}
      className="relative inline-flex size-11 items-center justify-center border border-line/18 bg-void/60 text-fog/80 transition-[border-color,color,transform] duration-200 hover:border-line/40 hover:text-ink active:scale-[0.96]"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        aria-hidden="true"
      >
        <path d={direction === "prev" ? "M10 2.5 4.5 8l5.5 5.5" : "M6 2.5 11.5 8 6 13.5"} />
      </svg>
      <CornerMarks size={2} className="opacity-70" />
    </button>
  );
}

function Thumb({ piece }: { piece: Media }) {
  const src = piece.kind === "video" ? piece.poster : piece.src;
  if (!src) {
    return (
      <span className="flex size-full items-center justify-center text-[10px] text-fog/70" aria-hidden="true">
        {piece.kind === "video" ? "▶" : ""}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizedImage(src, 96)}
      alt=""
      draggable={false}
      loading="lazy"
      className="size-full object-cover"
      style={{ objectPosition: piece.focus ? `${piece.focus.x}% ${piece.focus.y}%` : "center" }}
    />
  );
}

function PieceView({
  piece,
  work,
  index,
  count,
  inStage = false,
}: {
  piece: Media;
  work: Work;
  index: number;
  count: number;
  /** Inside the fixed-height carousel stage: fit the piece to the stage instead of the viewport. */
  inStage?: boolean;
}) {
  const description = piece.alt || (count > 1 ? `${work.title}, piece ${index + 1} of ${count}` : work.title);

  if (piece.kind === "video") {
    return piece.src ? (
      <video
        className={inStage ? "max-h-full max-w-full object-contain" : "max-h-[78svh] w-auto max-w-[92vw] object-contain"}
        controls
        playsInline
        preload="metadata"
        poster={piece.poster || undefined}
        aria-label={description}
      >
        <source src={piece.src} />
      </video>
    ) : (
      <MediaPlaceholder label="VIDEO" />
    );
  }

  return piece.src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={piece.src}
      alt={description}
      className={cn(
        "select-none object-contain",
        inStage ? "max-h-full max-w-full" : "max-h-[78svh] w-auto max-w-[92vw]",
      )}
      draggable={false}
      loading="eager"
    />
  ) : (
    <MediaPlaceholder label="IMAGE" />
  );
}

export function WorkInfo({ work }: { work: Work }) {
  return (
    <div className="mt-10 border-t border-line/10 pt-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="text-xs tracking-[0.22em] text-fog/70">
            WORK{workPieces(work).length > 1 ? ` · ${workPieces(work).length} PIECES` : ""}
          </div>
          <h1 className="mt-3 font-serif text-3xl leading-[0.95] tracking-[-0.05em] md:text-4xl">
            {work.title}
          </h1>
        </div>
        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          {work.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[11px] tracking-[0.22em] text-fog/70"
            >
              {t.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {work.summary ? (
        <p className="mt-4 max-w-3xl text-pretty text-sm leading-relaxed text-fog/80">{work.summary}</p>
      ) : null}

      <CaseStudy work={work} />
    </div>
  );
}

function CaseStudy({ work }: { work: Work }) {
  const facts = [
    { label: "CLIENT", value: work.client },
    { label: "ROLE", value: work.role },
    { label: "YEAR", value: work.year ? String(work.year) : undefined },
  ].filter((fact) => fact.value);

  const story = [
    { label: "01 / PROBLEM", text: work.problem },
    { label: "02 / APPROACH", text: work.solution },
    { label: "03 / RESULT", text: work.result },
  ].filter((part) => part.text);

  if (!facts.length && !story.length && !work.link) return null;

  return (
    <div className="mt-8 space-y-8 border-t border-line/10 pt-8">
      {facts.length || work.link ? (
        <dl className="flex flex-wrap items-end gap-x-10 gap-y-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[11px] tracking-[0.22em] text-fog/72">{fact.label}</dt>
              <dd className="mt-1.5 text-sm text-ink/90">{fact.value}</dd>
            </div>
          ))}
          {work.link ? (
            <div>
              <dt className="text-[11px] tracking-[0.22em] text-fog/72">LIVE</dt>
              <dd className="mt-1.5 text-sm">
                <a
                  href={work.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink/90 underline underline-offset-4 hover:text-ink"
                >
                  {new URL(work.link).hostname.replace(/^www\./, "")} ↗
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {story.length ? (
        <div className="grid gap-8 md:grid-cols-3">
          {story.map((part) => (
            <section key={part.label}>
              <h2 className="text-[11px] tracking-[0.22em] text-fog/72">{part.label}</h2>
              <p className="mt-3 whitespace-pre-line text-pretty text-sm leading-relaxed text-fog/85">
                {part.text}
              </p>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MediaPlaceholder({ label }: { label: string }) {
  return (
    <div className="relative flex h-[min(78svh,560px)] w-[min(92vw,980px)] items-center justify-center overflow-hidden border border-line/12 bg-void/25">
      <div className="absolute inset-0 bg-[radial-gradient(900px_700px_at_20%_10%,rgba(255,255,255,0.10),transparent_60%),radial-gradient(700px_600px_at_80%_30%,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_45%)]" />
      <div className="relative text-xs tracking-[0.22em] text-fog/70">
        MEDIA MISSING <span className="text-fog/45">/</span> {label}
      </div>
    </div>
  );
}
