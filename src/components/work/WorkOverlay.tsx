"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { Work } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { WorkInfo, WorkMedia } from "@/components/work/WorkViewer";
import { cn } from "@/lib/cn";

export const workLayoutId = (id: string) => `work-media-${id}`;

/**
 * Full-screen screening opened from a gallery card. The blurred backdrop shares a layoutId with the
 * card's image, so it expands out of the card; the sharp media and details fade in afterwards.
 */
export function WorkOverlay({ work, onClose }: { work: Work; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const backdropSrc = work.media.kind === "video" ? work.media.poster : work.media.src;
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // Focus moves into the dialog on open, stays inside it, and returns to the card on close.
  React.useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const fade = { duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.div
      ref={dialogRef}
      className="fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      // Keeps the wrapper mounted while the backdrop travels back into its card.
      exit={{ opacity: 0.999, transition: { duration: reduceMotion ? 0 : 0.65 } }}
    >
      <motion.div
        layoutId={workLayoutId(work.id)}
        className="absolute inset-0 bg-void"
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="absolute inset-0 scale-110 opacity-40 blur-3xl"
          style={{
            backgroundImage: backdropSrc ? `url(${backdropSrc})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_30%,transparent_30%,rgb(0_0_0/0.8)_100%)]" />
      </motion.div>

      <motion.div
        className="relative h-full overflow-y-auto"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { ...fade, delay: reduceMotion ? 0 : 0.28 } }}
        exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.18 } }}
      >
        <button
          ref={closeRef}
          type="button"
          data-sound="off"
          onClick={onClose}
          className={cn(
            "fixed right-6 top-6 z-[91] inline-flex h-11 w-11 items-center justify-center border border-line/18 bg-void/40 text-fog/70 backdrop-blur-md",
            "hover:border-line/35 hover:text-ink",
          )}
          aria-label="Close"
        >
          <span className="text-xl leading-none">×</span>
          <CornerMarks className="opacity-80" />
        </button>

        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
          <div className="flex flex-1 items-center justify-center">
            <WorkMedia work={work} />
          </div>
          <WorkInfo work={work} />
        </div>
      </motion.div>
    </motion.div>
  );
}
