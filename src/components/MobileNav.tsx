"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

export type MobileNavItem = {
  label: string;
  hint: string;
  href: string;
  sections: readonly string[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The header on phones: home and a menu button. The menu slides in from the
 * right as a side panel, so the links are full-width rows rather than four cramped boxes.
 */
export function MobileNav({
  items,
  current,
  quoteHref,
}: {
  items: readonly MobileNavItem[];
  current: string | null;
  quoteHref: string;
}) {
  const [open, setOpen] = React.useState(false);
  const reduceMotion = useReducedMotion();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const button = buttonRef.current;
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <div className="pointer-events-auto relative flex w-full items-center justify-between gap-3 border border-white/10 bg-black/75 px-2.5 py-2 md:hidden">
        <CornerMarks className="opacity-80" />
        <Link
          href="/"
          aria-label={`${SITE.name} home`}
          className="relative z-10 flex min-w-0 items-center gap-3"
        >
          <span className="grid size-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-black">
            <Image
              src={SITE.profileImage}
              alt=""
              width={160}
              height={160}
              quality={82}
              className="h-full w-full scale-[1.12] object-cover"
              priority
            />
          </span>
          <span className="truncate font-serif text-2xl leading-none tracking-[-0.04em] text-ink">
            {SITE.name}
          </span>
        </Link>
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          <button
            ref={buttonRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
            className="grid size-11 place-items-center border border-line/15 bg-void/70 text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M10 17h10" />
            </svg>
          </button>
        </div>
      </div>

      {/* On the body, so it covers everything else that floats over the page. */}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div className="fixed inset-0 z-[70] md:hidden">
                  <motion.button
                    type="button"
                    aria-label="Close menu"
                    tabIndex={-1}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                  <motion.div
                    ref={panelRef}
                    id="mobile-menu"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    className="absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col border-l border-line/15 bg-void pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
                    initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
                    animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <div aria-hidden="true" className="section-grid-bg" />
                    <div className="relative flex items-center justify-between px-5">
                      <span className="font-serif text-3xl leading-none tracking-[-0.05em]">
                        {SITE.name}
                      </span>
                      <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setOpen(false)}
                        className="grid size-11 place-items-center border border-line/15 text-ink"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="size-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="square"
                          aria-hidden="true"
                        >
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>

                    <nav
                      aria-label="Primary"
                      className="relative mt-6 flex-1 overflow-y-auto border-t border-line/12"
                    >
                      {items.map((item, index) => {
                        const active =
                          current !== null && item.sections.includes(current);
                        return (
                          <motion.div
                            key={item.href}
                            initial={
                              reduceMotion ? false : { opacity: 0, x: 18 }
                            }
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.4,
                              ease: EASE,
                              delay: 0.1 + index * 0.04,
                            }}
                          >
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              aria-current={active ? "location" : undefined}
                              className={cn(
                                "flex items-center gap-4 border-b border-line/12 px-5 py-4 active:bg-white/[0.06]",
                                active && "bg-white/[0.04]",
                              )}
                            >
                              <span className="w-6 text-[11px] tabular-nums tracking-[0.22em] text-fog/70">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-serif text-2xl leading-tight tracking-[-0.03em] text-ink">
                                  {item.label}
                                </span>
                                <span className="mt-0.5 block text-xs text-fog/72">
                                  {item.hint}
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "text-lg",
                                  active ? "text-ink" : "text-fog/50",
                                )}
                              >
                                {active ? "•" : "→"}
                              </span>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </nav>

                    <div className="relative px-5 pt-5">
                      <Link
                        href={quoteHref}
                        onClick={() => setOpen(false)}
                        className="flex h-12 items-center justify-between bg-ink px-5 text-xs tracking-[0.22em] text-void"
                      >
                        <span>GET A QUOTE</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
