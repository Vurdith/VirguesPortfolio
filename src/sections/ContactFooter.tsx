"use client";

import * as React from "react";
import Link from "next/link";

import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { QuoteForm } from "@/components/QuoteForm";
import { RevealHeading } from "@/components/RevealHeading";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

export function ContactFooter({ className }: { className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const showCopied = () => {
    setCopied(true);
    if (resetTimer.current) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = SITE.email;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-999px";
    textArea.style.left = "-999px";
    document.body.appendChild(textArea);
    textArea.select();
    const copiedEmail = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copiedEmail;
  };

  const copyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(SITE.email);
      } else if (!fallbackCopy()) {
        return;
      }
      showCopied();
    } catch {
      if (fallbackCopy()) {
        showCopied();
      }
    }
  };

  return (
    <footer
      id="contact"
      className={cn("relative overflow-hidden border-t border-line/10 py-16 md:py-20", className)}
      aria-label="Contact"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="mail" className="size-4" />
              <span>CONTACT</span>
            </div>
            <RevealHeading className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
              High contrast.
            </RevealHeading>
            <p className="mt-6 max-w-prose text-pretty text-sm leading-relaxed text-fog/80">
              If the work feels right, we can build something sharp together. No fluff. Fast
              feedback loops. Clean handoff.
            </p>

            <button
              type="button"
              onClick={() => void copyEmail()}
              className={cn(
                "group relative mt-8 flex w-full items-center justify-between gap-3 border border-line/18 bg-void/30 px-4 py-3 text-xs tracking-[0.22em] text-ink backdrop-blur-md",
                "hover:border-line/35",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <MonoIcon name="mail" className="size-4 shrink-0" />
                <span className="truncate font-medium">{SITE.email}</span>
              </span>
              <span className="shrink-0 text-fog/70" aria-live="polite">
                {copied ? "COPIED" : "COPY"}
              </span>
              <CornerMarks className="opacity-80" />
            </button>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                href={SITE.socials.discord}
                className="group flex items-center justify-between border border-line/12 bg-void/35 px-4 py-3 text-xs tracking-[0.22em] text-fog/80 hover:border-line/25 hover:text-ink"
              >
                <span>DISCORD</span>
                <span className="text-fog/72 transition-colors group-hover:text-ink">↗</span>
              </Link>
              <Link
                href={SITE.socials.x}
                className="group flex items-center justify-between border border-line/12 bg-void/35 px-4 py-3 text-xs tracking-[0.22em] text-fog/80 hover:border-line/25 hover:text-ink"
              >
                <span>X</span>
                <span className="text-fog/72 transition-colors group-hover:text-ink">↗</span>
              </Link>
            </div>
          </div>

          <div id="quote" className="relative z-[41] scroll-mt-24 md:col-span-7">
            <QuoteForm />
          </div>
        </div>
      </div>
    </footer>
  );
}


