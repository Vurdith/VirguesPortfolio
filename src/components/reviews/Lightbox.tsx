"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

import type { ReviewAttachment } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { useDialog } from "@/hooks/useDialog";
import { cn } from "@/lib/cn";

/** Full-size view of an item's images. Flat and cheap on purpose, so it is fine in the admin too. */
export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ReviewAttachment[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  useDialog(ref, onClose, closeRef);

  const count = images.length;
  const step = React.useCallback((by: number) => onIndex((index + by + count) % count), [index, count, onIndex]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [step]);

  const image = images[index];
  if (!image || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${count}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={image.id}
        src={image.url}
        alt={`Attachment ${index + 1} of ${count}`}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full object-contain"
      />

      <button
        ref={closeRef}
        type="button"
        data-sound="off"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close image"
        className="absolute right-4 top-4 inline-flex size-11 items-center justify-center border border-line/18 bg-void/80 text-xl leading-none text-fog/80 hover:border-line/40 hover:text-ink md:right-6 md:top-6"
      >
        ×
        <CornerMarks className="opacity-80" />
      </button>

      {count > 1 ? (
        <>
          {([-1, 1] as const).map((by) => (
            <button
              key={by}
              type="button"
              data-sound="off"
              onClick={(event) => {
                event.stopPropagation();
                step(by);
              }}
              aria-label={by < 0 ? "Previous image" : "Next image"}
              className={cn(
                "absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center border border-line/18 bg-void/80 text-lg text-fog/80 hover:border-line/40 hover:text-ink",
                by < 0 ? "left-3 md:left-6" : "right-3 md:right-6",
              )}
            >
              {by < 0 ? "←" : "→"}
            </button>
          ))}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] tabular-nums tracking-[0.22em] text-fog/80" aria-hidden="true">
            {index + 1} / {count}
          </p>
        </>
      ) : null}
    </motion.div>,
    document.body,
  );
}

/** Square thumbnails; pressing one opens the lightbox on it. */
export function AttachmentGrid({
  images,
  onOpen,
  className,
}: {
  images: ReviewAttachment[];
  onOpen: (index: number) => void;
  className?: string;
}) {
  if (!images.length) return null;
  return (
    <ul className={cn("grid grid-cols-4 gap-2", className)}>
      {images.map((image, index) => (
        <li key={image.id}>
          <button
            type="button"
            data-sound="off"
            onClick={() => onOpen(index)}
            aria-label={`Open image ${index + 1} of ${images.length}`}
            className="group relative block aspect-square w-full overflow-hidden border border-line/14 bg-void/50 transition-colors duration-200 hover:border-line/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
