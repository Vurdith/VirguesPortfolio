"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useSpring, useTransform } from "framer-motion";

import { BrandLogo } from "@/components/BrandLogo";
import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS } from "@/lib/payments";
import { useSectionProgress } from "@/hooks/useSectionProgress";

export function PaymentSection({ className }: { className?: string }) {
  const ref = React.useRef<HTMLElement>(null);
  const scrollYProgress = useSectionProgress(ref, "enter-exit");

  const lineScale = useSpring(useTransform(scrollYProgress, [0.18, 0.82], [0, 1]), {
    stiffness: 120,
    damping: 28,
  });

  return (
    <section
      id="payment"
      ref={ref}
      className={cn("relative overflow-hidden border-y border-line/10 py-20 md:py-28", className)}
      aria-label="Payment"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-full w-px origin-top bg-line/15"
        style={{ scaleY: lineScale }}
      />

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <header className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="card" className="size-4" />
              <span>PAYMENT</span>
            </div>
            <RevealHeading className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">Checkout.</RevealHeading>
          </div>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-fog/80 md:col-span-7 md:justify-self-end">
            Payment happens after the scope is agreed, so the checkout screen stays simple:
            pick a method, pay securely, and keep the project moving.
          </p>
        </header>

        <div className="mt-10">
          <div className="grid gap-4 md:grid-cols-3">
            {PAYMENT_METHODS.map((method) => (
              <PaymentMethodCard key={method.title} method={method} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentMethodCard({ method }: { method: (typeof PAYMENT_METHODS)[number] }) {
  return (
    <article className="perf-card group relative min-h-[320px] overflow-hidden border border-line/12 bg-void/35 p-6 transition-colors duration-300 hover:border-line/30">
      <CornerMarks size={4} className="opacity-70" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-px bg-line/35" />
        <div className="absolute -right-20 -top-20 size-56 rounded-full border border-line/10" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h3 className="font-serif text-3xl leading-none tracking-[-0.05em]">
              {method.title}
            </h3>
          </div>
          <div className="grid size-12 shrink-0 place-items-center border border-line/12 bg-black/25">
            <BrandLogo name={method.logo} className="size-6" />
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-fog/78">{method.description}</p>

        <div className="mt-auto pt-8">
          <Link
            href={method.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group/button relative inline-flex w-full items-center justify-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink hover:border-line/35"
            aria-label={method.cta}
          >
            <span>{method.cta.toUpperCase()}</span>
            <span className="h-px w-10 bg-line/20 transition-all duration-300 group-hover/button:w-14 group-hover/button:bg-line/40" />
            <span className="text-fog/70">↗</span>
            <CornerMarks size={4} className="opacity-70" />
          </Link>
        </div>
      </div>
    </article>
  );
}

