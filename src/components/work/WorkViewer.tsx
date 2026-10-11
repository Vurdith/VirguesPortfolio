"use client";

import * as React from "react";
import { motion } from "framer-motion";

import type { Work } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { usePageTransition } from "@/components/PageTransition";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function WorkViewer({ work }: { work: Work }) {
  const { navigate } = usePageTransition();
  const { playClose } = useUiSounds();

  const close = React.useCallback(() => {
    playClose();
    try {
      const ref = document.referrer;
      const canBack =
        ref &&
        new URL(ref).origin === window.location.origin &&
        window.history.length > 1;
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

export function WorkMedia({ work }: { work: Work }) {
  if (work.media.kind === "video") {
    return work.media.src ? (
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
    );
  }

  return work.media.src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={work.media.src}
      alt={work.media.alt || work.title}
      className="max-h-[78svh] w-auto max-w-[92vw] object-contain"
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
              <dt className="text-[10px] tracking-[0.22em] text-fog/72">{fact.label}</dt>
              <dd className="mt-1.5 text-sm text-ink/90">{fact.value}</dd>
            </div>
          ))}
          {work.link ? (
            <div>
              <dt className="text-[10px] tracking-[0.22em] text-fog/72">LIVE</dt>
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
              <h2 className="text-[10px] tracking-[0.22em] text-fog/72">{part.label}</h2>
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


