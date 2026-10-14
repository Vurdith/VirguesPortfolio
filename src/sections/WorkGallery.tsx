"use client";

import * as React from "react";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

import type { Media, Work } from "@/types/portfolio";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { WorkOverlay, workLayoutId } from "@/components/work/WorkOverlay";
import { optimizedImage } from "@/lib/images";
import { cn } from "@/lib/cn";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { focusPosition } from "@/lib/focus";
import { workPieces } from "@/lib/work";
import { SITE } from "@/lib/site";
import { usePointerTracking } from "@/hooks/usePointerTracking";
import { useResilientImage } from "@/hooks/useResilientImage";
import { useUiSounds } from "@/hooks/useUiSounds";

const MAX_TILT_DEG = 15;
const MAX_DECK_LAYERS = 3;

const viewHash = (work: Work) => `#view-${work.slug}`;

const BACKDROPS = [
  "radial-gradient(900px 700px at 20% 10%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(700px 600px at 80% 30%, rgba(255,255,255,0.07), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
  "radial-gradient(900px 700px at 85% 18%, rgba(255,255,255,0.11), transparent 60%), radial-gradient(800px 600px at 25% 70%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 45%), linear-gradient(45deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
  "radial-gradient(900px 700px at 35% 20%, rgba(255,255,255,0.10), transparent 62%), radial-gradient(800px 600px at 78% 80%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 45%), linear-gradient(225deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
  "radial-gradient(900px 700px at 70% 12%, rgba(255,255,255,0.12), transparent 62%), radial-gradient(800px 600px at 20% 85%, rgba(255,255,255,0.06), transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.06), transparent 45%), linear-gradient(315deg, rgba(255,255,255,0.04), rgba(0,0,0,0.0))",
] as const;

export function WorkGallery({
  works,
  className,
}: {
  works: Work[];
  className?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const scrollYProgress = useSectionProgress(ref, "enter-exit");


  const bgY = useSpring(useTransform(scrollYProgress, [0, 1], [-100, 100]), {
    stiffness: 100,
    damping: 30,
    mass: 0.5,
  });
  
  const bgScale = useSpring(useTransform(scrollYProgress, [0, 1], [1.1, 1.25]), {
    stiffness: 100,
    damping: 30,
  });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 0.6, 0.6, 0]);

  const { playClose } = useUiSounds();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = works.find((work) => work.id === activeId) ?? null;

  const open = React.useCallback((work: Work) => {
    setActiveId(work.id);
    window.history.pushState(null, "", viewHash(work));
  }, []);

  const close = React.useCallback(() => {
    playClose();
    if (window.location.hash.startsWith("#view-")) {
      // The popstate listener below clears the overlay.
      window.history.back();
    } else {
      setActiveId(null);
    }
  }, [playClose]);

  // Browser back/forward should close (or reopen) the screening.
  React.useEffect(() => {
    const sync = () => {
      const match = works.find((work) => window.location.hash === viewHash(work));
      setActiveId(match?.id ?? null);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [works]);
  
  return (
    <section
      id="work"
      ref={ref}
      className={cn("relative py-20 md:py-28 overflow-hidden", className)}
      aria-label="Work"
    >
      {/* Cinematic Background Integration */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none transform-gpu will-change-transform"
        style={{
          y: bgY,
          scale: bgScale,
          opacity: bgOpacity,
          backgroundImage: `url(${SITE.workImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "radial-gradient(ellipse at center, black 20%, rgba(0,0,0,0.3) 50%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, rgba(0,0,0,0.3) 50%, transparent 85%)",
        }}
      />

      <div className="absolute inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-void via-transparent to-void" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="work" className="size-4" />
              <span>SELECTED</span>
            </div>
            <RevealHeading className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl origin-left">Work.</RevealHeading>
          </div>

          <p className="max-w-lg text-pretty text-sm leading-relaxed text-fog/80">
            Recent interface and design projects. Click any piece to view it full screen.
          </p>
        </header>

        {works.length ? (
          <LayoutGroup>
            <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {works.map((work, idx) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  backdrop={BACKDROPS[idx % BACKDROPS.length]}
                  onOpen={open}
                />
              ))}
            </div>
            <AnimatePresence>
              {active ? <WorkOverlay key={active.id} work={active} onClose={close} /> : null}
            </AnimatePresence>
          </LayoutGroup>
        ) : (
          <p className="mt-10 border border-line/12 bg-void/25 p-6 text-sm text-fog/78">
            New work is on the way. Get in touch to see more.
          </p>
        )}
      </div>
    </section>
  );
}

function WorkCard({
  work,
  backdrop,
  onOpen,
}: {
  work: Work;
  backdrop: string;
  onOpen: (work: Work) => void;
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useMotionValue(0);
  const rY = useMotionValue(0);
  const hover = useMotionValue(0);

  const x = useSpring(mx, { stiffness: 520, damping: 44, mass: 0.6 });
  const y = useSpring(my, { stiffness: 520, damping: 44, mass: 0.6 });
  const rotX = useSpring(rX, { stiffness: 520, damping: 44, mass: 0.6 });
  const rotY = useSpring(rY, { stiffness: 520, damping: 44, mass: 0.6 });
  const o = useSpring(hover, { stiffness: 520, damping: 44, mass: 0.6 });

  const mask = useMotionTemplate`radial-gradient(180px 180px at ${x}px ${y}px, #000 0%, #000 58%, transparent 76%)`;
  const lensX = useMotionTemplate`${x}px`;
  const lensY = useMotionTemplate`${y}px`;
  const tiltShadow = useTransform(o, [0, 1], ["0px", "4px"]);
  const shadow = useMotionTemplate`0 ${tiltShadow} 12px rgba(0,0,0,0.8)`;

  // The lens follows the pointer; the card tilts toward it.
  const pointer = usePointerTracking<HTMLDivElement>({
    onFrame: (point, size) => {
      mx.set(point.x);
      my.set(point.y);
      rY.set(((point.x - size.width / 2) / (size.width / 2)) * MAX_TILT_DEG);
      rX.set((-(point.y - size.height / 2) / (size.height / 2)) * MAX_TILT_DEG);
    },
    onLeave: () => {
      hover.set(0);
      rX.set(0);
      rY.set(0);
    },
  });

  // Cards are a few hundred pixels wide; don't download the full-size original for them.
  const isVideo = work.media.kind === "video";
  const rawSrc = isVideo ? work.media.poster || "" : work.media.src;
  const cardSrc = useResilientImage(isVideo ? rawSrc : optimizedImage(work.media.src), rawSrc);

  // Collections show the next few pieces stacked behind the cover.
  const pieces = workPieces(work);
  const behind = pieces.slice(1, 1 + MAX_DECK_LAYERS);

  return (
    <Link
      href={`/work/${work.slug}`}
      // Cards open the overlay; the full page is only needed for modified clicks and direct visits.
      prefetch={false}
      className="group block"
      data-cursor="view"
      data-pieces={pieces.length > 1 ? pieces.length : undefined}
      onClick={(event) => {
        // Let modified clicks (new tab, etc.) use the real /work/[slug] page.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        onOpen(work);
      }}
    >
      <motion.div
        onPointerEnter={(event) => {
          hover.set(1);
          pointer.onPointerEnter(event);
        }}
        onPointerMove={pointer.onPointerMove}
        onPointerLeave={pointer.onPointerLeave}
        style={{
          rotateX: rotX,
          rotateY: rotY,
          transformPerspective: 800,
        }}
        className="relative aspect-[4/5] transform-gpu will-change-transform [transform-style:preserve-3d]"
      >
        {behind
          .map((piece, i) => <DeckLayer key={i} piece={piece} depth={i + 1} backdrop={backdrop} />)
          .reverse()}

        <motion.div
          style={{ boxShadow: shadow }}
          className="perf-card absolute inset-0 overflow-hidden border border-white/5 bg-void/40"
        >
          <motion.div
            layoutId={workLayoutId(work.id)}
            className="absolute inset-0 blur-[2px]"
            style={{
              scale: 1.025,
              backgroundImage: cardSrc
                ? `linear-gradient(180deg, rgb(0 0 0 / 0.10), rgb(0 0 0 / 0.78)), url(${cardSrc}), ${backdrop}`
                : `${backdrop}, linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0.8) 100%)`,
              backgroundSize: "cover",
              backgroundPosition: focusPosition(work.media),
            }}
          >
            {isVideo && work.media.src ? (
              <>
                <CardVideo src={work.media.src} poster={work.media.poster} position={focusPosition(work.media)} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/80" />
              </>
            ) : null}
          </motion.div>

          {/* Sharp-field revealed only under the moving lens (mask). */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              opacity: o,
              WebkitMaskImage: mask as unknown as string,
              maskImage: mask as unknown as string,
            }}
          >
            <div
              className="absolute inset-0 scale-[1.01]"
              style={{ 
                backgroundImage: cardSrc ? `url(${cardSrc})` : `${backdrop}`,
                backgroundSize: "cover",
                backgroundPosition: focusPosition(work.media),
              }}
            />
            <div aria-hidden="true" className="scanlines" />
          </motion.div>

          {/* Lens hardware: rotating rings + soft glare. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 size-64"
            style={{
              x: lensX,
              y: lensY,
              translateX: "-50%", 
              translateY: "-50%",
              opacity: o 
            }}
          >
            <div className="absolute inset-0 rounded-full border border-line/30 animate-ring" />
            <div className="absolute inset-[18px] rounded-full border border-line/20 [border-style:dashed] animate-ring [animation-duration:3.6s]" />
            <div aria-hidden="true" className="absolute inset-[30px] overflow-hidden rounded-full">
              <div className="scanlines opacity-70" />
            </div>
            <div className="absolute inset-0 rounded-full bg-white/[0.06]" />
          </motion.div>

          {pieces.length > 1 ? (
            <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-2 border border-line/20 bg-void/75 px-2 py-1 text-[11px] tracking-[0.22em] text-ink">
              <span aria-hidden="true" className="relative block size-2.5">
                <span className="absolute inset-0 translate-x-[3px] -translate-y-[3px] border border-line/50" />
                <span className="absolute inset-0 border border-line/90 bg-void" />
              </span>
              {pieces.length} PIECES
            </div>
          ) : null}

          {/* Bottom metadata (kept inside the strict card). */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-serif text-xl leading-none tracking-[-0.03em]">{work.title}</h3>
              <div className="text-[11px] tracking-[0.22em] text-fog/70">{work.year ?? "—"}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {work.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center border border-line/12 bg-void/70 px-2 py-1 text-[11px] tracking-[0.22em] text-fog/70"
                >
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Link>
  );
}

/** A piece peeking out above the cover: higher, smaller and dimmer the deeper it sits. */
function DeckLayer({ piece, depth, backdrop }: { piece: Media; depth: number; backdrop: string }) {
  const src = useResilientImage(
    piece.kind === "video" ? piece.poster || "" : optimizedImage(piece.src, 640),
    piece.kind === "video" ? "" : piece.src,
  );
  const style = {
    "--deck-y": `${-depth * 10}px`,
    "--deck-z": `${-depth * 8}px`,
    "--deck-s": 1 - depth * 0.045,
    // On hover the pieces fan out like a hand of cards: higher, to alternating sides, tilted.
    "--fan-x": `${(depth % 2 ? 1 : -1) * depth * 14}px`,
    "--fan-y": `${-depth * 18}px`,
    "--fan-r": `${(depth % 2 ? 1 : -1) * (2 + depth * 2.5)}deg`,
    animationDelay: `${-depth * 1.4}s`,
  } as React.CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="deck-layer absolute inset-0 overflow-hidden border border-white/25 bg-void"
      style={style}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: src ? `url(${src}), ${backdrop}` : backdrop,
          backgroundSize: "cover",
          backgroundPosition: focusPosition(piece),
        }}
      />
      <div className="absolute inset-0 bg-black" style={{ opacity: 0.1 + depth * 0.15 }} />
    </div>
  );
}



/** Muted looping preview for video works; only plays while the card is on screen. */
function CardVideo({ src, poster, position }: { src: string; poster?: string; position: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
      style={{ objectPosition: position }}
      // The time fragment makes browsers paint the first frame when there is no poster.
      src={`${src}#t=0.001`}
      poster={poster || undefined}
      muted
      loop
      playsInline
      preload="metadata"
      tabIndex={-1}
    />
  );
}
