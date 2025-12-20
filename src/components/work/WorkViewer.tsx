"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import type { Work } from "@/types/portfolio";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function WorkViewer({ work }: { work: Work }) {
  const router = useRouter();
  const { playHover, playClose } = useUiSounds();

  const close = React.useCallback(() => {
    playClose();
    try {
      const ref = document.referrer;
      const canBack =
        ref &&
        new URL(ref).origin === window.location.origin &&
        window.history.length > 1;
      if (canBack) {
        router.back();
        return;
      }
    } catch {
      // ignore
    }

    router.push("/#work");
  }, [playClose, router]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <main className="film-grain vignette min-h-dvh">
      <motion.button
        type="button"
        onMouseEnter={playHover}
        onClick={close}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "fixed right-6 top-6 z-[90] inline-flex h-11 w-11 items-center justify-center border border-line/18 bg-void/40 text-fog/70 backdrop-blur-md",
          "hover:border-line/35 hover:text-ink",
        )}
        aria-label="Close"
      >
        <span className="text-xl leading-none">×</span>
        <span className="pointer-events-none absolute inset-0 opacity-80">
          <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
          <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />
        </span>
      </motion.button>

      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-16 md:px-10">
        <div className="flex flex-1 items-center justify-center">
          {work.media.kind === "video" ? (
            work.media.src ? (
              <video
                className="max-h-[78svh] w-auto max-w-[92vw] object-contain"
                controls
                playsInline
                preload="metadata"
                poster={work.media.poster || undefined}
              >
                <source src={work.media.src} />
              </video>
            ) : (
              <MediaPlaceholder label="VIDEO" />
            )
          ) : work.media.src ? (
            <img
              src={work.media.src}
              alt={work.title}
              className="max-h-[78svh] w-auto max-w-[92vw] object-contain"
              loading="eager"
            />
          ) : (
            <MediaPlaceholder label="IMAGE" />
          )}
        </div>

        <div className="mt-10 border-t border-line/10 pt-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-xs tracking-[0.22em] text-fog/70">WORK</div>
              <h1 className="mt-3 font-serif text-3xl leading-[0.95] tracking-[-0.05em] md:text-4xl">
                {work.title}
              </h1>
            </div>
            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
              {work.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[10px] tracking-[0.22em] text-fog/70 backdrop-blur-sm"
                >
                  {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {work.summary ? (
            <p className="mt-4 max-w-3xl text-pretty text-sm leading-relaxed text-fog/80">
              {work.summary}
            </p>
          ) : null}
        </div>
      </div>
    </main>
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


