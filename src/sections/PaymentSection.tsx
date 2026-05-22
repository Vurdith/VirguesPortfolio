"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { MonoIcon } from "@/components/MonoIcon";
import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

const STRIPE_URL = "https://buy.stripe.com/6oUaEZ9geg0p0Qm3X7aMU00";
const PAYPAL_EMAIL = "reeceleneveu@gmail.com";
const PAYPAL_URL = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(
  PAYPAL_EMAIL
)}&item_name=${encodeURIComponent("Virgue project payment")}&currency_code=GBP`;

const PAYMENT_METHODS = [
  {
    title: "Stripe",
    eyebrow: "Live Checkout",
    description:
      "Fast encrypted checkout for cards and supported wallets. Confirmation is handled immediately after payment.",
    cta: "Pay with Stripe",
    href: STRIPE_URL,
  },
  {
    title: "PayPal",
    eyebrow: PAYPAL_EMAIL,
    description:
      "Prefer PayPal? Use this email to send payment once the project scope and quote are confirmed.",
    cta: "Pay with PayPal",
    href: PAYPAL_URL,
  },
] as const;

const PAYMENT_FLOW = [
  { label: "Scope agreed", detail: "Quote and deliverables are confirmed first." },
  { label: "Checkout sent", detail: "Client chooses Stripe or PayPal after the quote is confirmed." },
  { label: "Work begins", detail: "Payment confirmation keeps the handoff clear." },
] as const;

export function PaymentSection({ className }: { className?: string }) {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const skewX = useTransform(scrollYProgress, [0, 1], [-3, 3]);
  const skewY = useTransform(scrollYProgress, [0, 1], [-1, 1]);
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
            <motion.h2
              style={{ skewX, skewY }}
              className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl"
            >
              Checkout.
            </motion.h2>
          </div>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-fog/80 md:col-span-7 md:justify-self-end">
            Payment happens after the scope is agreed, so the checkout screen stays simple:
            pick a method, pay securely, and keep the project moving.
          </p>
        </header>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 md:grid-cols-2">
            {PAYMENT_METHODS.map((method) => (
              <PaymentMethodCard key={method.title} method={method} />
            ))}
          </div>

          <div className="relative overflow-hidden border border-line/12 bg-void/30 p-5 backdrop-blur-sm">
            <CornerLines />
            <div className="flex items-center gap-3 text-[10px] tracking-[0.28em] text-fog/60">
              <MonoIcon name="process" className="size-4" />
              <span>FLOW</span>
            </div>
            <h3 className="mt-3 font-serif text-2xl leading-none tracking-[-0.04em]">
              How it works
            </h3>
            <div className="mt-6 grid gap-5">
              {PAYMENT_FLOW.map((item, index) => (
                <div key={item.label} className="grid grid-cols-[36px_1fr] gap-4">
                  <div className="grid size-9 place-items-center border border-line/15 bg-black/35 text-[10px] text-fog/70">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="text-xs tracking-[0.18em] text-ink/82">
                      {item.label.toUpperCase()}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-fog/62">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentMethodCard({ method }: { method: (typeof PAYMENT_METHODS)[number] }) {
  const { playHover, playClick } = useUiSounds();

  return (
    <article className="group relative min-h-[320px] overflow-hidden border border-line/12 bg-void/35 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-line/30">
      <CornerLines />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-px bg-line/35" />
        <div className="absolute -right-20 -top-20 size-56 rounded-full border border-line/10" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] tracking-[0.28em] text-fog/60">{method.eyebrow}</p>
            <h3 className="mt-4 font-serif text-3xl leading-none tracking-[-0.05em]">
              {method.title}
            </h3>
          </div>
          <div className="grid size-10 shrink-0 place-items-center border border-line/12 bg-black/25">
            <MonoIcon name="card" className="size-4" />
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-fog/78">{method.description}</p>

        <div className="mt-auto pt-8">
          <Link
            href={method.href}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={playHover}
            onClick={playClick}
            className="group/button relative inline-flex w-full items-center justify-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink hover:border-line/35"
            aria-label={method.cta}
          >
            <span>{method.cta.toUpperCase()}</span>
            <span className="h-px w-10 bg-line/20 transition-all duration-300 group-hover/button:w-14 group-hover/button:bg-line/40" />
            <span className="text-fog/70">↗</span>
            <CornerLines />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CornerLines() {
  return (
    <span className="pointer-events-none absolute inset-0 opacity-70">
      <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-line/30" />
      <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-line/30" />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-line/30" />
      <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-line/30" />
    </span>
  );
}
