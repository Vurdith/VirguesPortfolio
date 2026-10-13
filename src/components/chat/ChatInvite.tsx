"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

import { CHAT_OPENERS } from "@/components/chat/openers";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The way into the chat from the contact section. Each row opens the chat with that choice already
 * sent as the first message, so the assistant starts on the right question.
 */
export function ChatInvite({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE }}
      className={cn("relative border border-line/14 bg-void/30", className)}
    >
      <CornerMarks className="opacity-80" />

      <div className="p-6 md:p-10">
        <h3 className="font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">What are you building?</h3>
        <p className="mt-4 max-w-prose text-pretty text-sm leading-relaxed text-fog/80">
          Pick one and the assistant takes it from there: a few questions, a price, then the brief goes to {SITE.name}, who replies
          to you personally.
        </p>

        <nav aria-label="Start a brief" className="mt-6 border-t border-line/12">
          {CHAT_OPENERS.map((opener, index) => (
            <Link
              key={opener.id}
              href={opener.message ? `/chat?about=${opener.id}` : "/chat"}
              onClick={() => trackEvent("chat_opened", { from: opener.id })}
              className="group relative block overflow-hidden border-b border-line/12 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink/85"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none"
              />
              <span className="relative flex items-center gap-4 px-4 py-3.5 md:gap-6">
                <span className="w-6 text-[11px] tabular-nums tracking-[0.22em] text-fog/70 transition-colors duration-300 group-hover:text-void/70 group-focus-visible:text-void/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-xl leading-tight tracking-[-0.03em] text-ink transition-colors duration-300 group-hover:text-void group-focus-visible:text-void md:text-2xl">
                    {opener.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-fog/72 transition-colors duration-300 group-hover:text-void/70 group-focus-visible:text-void/70">
                    {opener.hint}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="-translate-x-2 text-lg text-void opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                >
                  →
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <p className="mt-3 text-xs text-fog/72">It takes a few minutes. You can attach reference images in the chat.</p>
      </div>
    </motion.div>
  );
}
