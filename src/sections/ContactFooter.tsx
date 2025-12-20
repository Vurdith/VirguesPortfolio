"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";
import { useUiSounds } from "@/hooks/useUiSounds";

export function ContactFooter({ className }: { className?: string }) {
  const { playHover, playClick } = useUiSounds();
  const [copied, setCopied] = React.useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <footer
      id="contact"
      className={cn("relative border-t border-line/10 py-16 md:py-20", className)}
      aria-label="Contact"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="md:col-span-7">
            <p className="text-xs tracking-[0.22em] text-fog/70">CONTACT</p>
            <h2 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
              High contrast.
            </h2>
            <p className="mt-6 max-w-prose text-pretty text-sm leading-relaxed text-fog/80">
              If the work feels right, we can build something sharp together. No fluff. Fast
              feedback loops. Clean handoff.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onMouseEnter={playHover}
                onClick={() => {
                  playClick();
                  void copyEmail();
                }}
                className={cn(
                  "group relative inline-flex items-center gap-3 border border-line/18 bg-void/30 px-5 py-3 text-xs tracking-[0.22em] text-ink backdrop-blur-md",
                  "hover:border-line/35",
                )}
              >
                <span className="text-fog/70">EMAIL</span>
                <span className="font-medium">{SITE.email}</span>
                <span className="text-fog/70">{copied ? "COPIED" : "COPY"}</span>
                <span className="pointer-events-none absolute inset-0 opacity-80">
                  <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
                  <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
                  <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />
                </span>
              </button>

              <div className="text-xs tracking-[0.18em] text-fog/60">
                Prefer DM? Use the links.
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="border border-line/12 bg-void/25 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-[0.22em] text-fog/70">LINKS</div>
              </div>

              <div className="mt-6 space-y-3">
                <Link
                  href={SITE.socials.discord}
                  onMouseEnter={playHover}
                  onClick={playClick}
                  className="group flex items-center justify-between border border-line/12 bg-void/35 px-4 py-3 text-xs tracking-[0.22em] text-fog/80 hover:border-line/25 hover:text-ink"
                >
                  <span>DISCORD</span>
                  <span className="text-fog/50 transition-colors group-hover:text-fog/70">↗</span>
                </Link>
                <Link
                  href={SITE.socials.x}
                  onMouseEnter={playHover}
                  onClick={playClick}
                  className="group flex items-center justify-between border border-line/12 bg-void/35 px-4 py-3 text-xs tracking-[0.22em] text-fog/80 hover:border-line/25 hover:text-ink"
                >
                  <span>X</span>
                  <span className="text-fog/50 transition-colors group-hover:text-fog/70">↗</span>
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


