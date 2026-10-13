"use client";

import * as React from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import type { AdminBrief } from "@/lib/chat/admin";
import { cn } from "@/lib/cn";
import type { QuoteStatus } from "@/types/portfolio";
import { contactLink, money, total, unitPrice } from "./shared";

const HANDLED: { key: QuoteStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "replied", label: "Replied" },
  { key: "closed", label: "Closed" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** What the conversation has established, and what you can do about it. The actions stay pinned at the bottom. */
export function BriefDetails({
  brief,
  busy,
  onHandled,
  onEnd,
  onUnsteer,
  onDelete,
}: {
  brief: AdminBrief;
  busy: boolean;
  onHandled: (handled: QuoteStatus) => void;
  onEnd: () => void;
  onUnsteer: (noteId: string) => void;
  onDelete: () => void;
}) {
  const info = brief.brief;
  const replica = info.styleReplication;
  const sum = total(brief);
  const link = contactLink(info.contact);
  const open = brief.status === "open";
  const finished = brief.status === "resolved";
  const [menu, setMenu] = React.useState(false);
  const [confirm, setConfirm] = React.useState<"end" | "delete" | null>(null);

  React.useEffect(() => {
    setMenu(false);
    setConfirm(null);
  }, [brief.id]);

  // What the assistant has not found out yet, so you know what to ask about.
  const missing = [
    !info.contact && "contact",
    !info.platform && "platform",
    !info.deadline && "deadline",
    !info.frames && (replica ? "task count" : "frame count"),
    !info.style && "style",
  ].filter(Boolean) as string[];

  const hasMore = Boolean(info.style || info.references || info.extras);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        <div className="rounded-2xl border border-line/10 bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-fog/65">{replica ? "Style replication" : "Original design"}</p>
            <span className="text-xs tabular-nums text-fog/45">${brief.costUsd.toFixed(3)}</span>
          </div>
          <p className="mt-2 font-serif text-5xl leading-none tracking-[-0.05em]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={sum ?? unitPrice(brief)} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="inline-block tabular-nums">
                {money(sum ?? unitPrice(brief))}
              </motion.span>
            </AnimatePresence>
          </p>
          <p className="mt-2 text-sm text-fog/65">
            {money(unitPrice(brief))} per {replica ? "task" : "frame"}
            {info.frames ? ` × ${info.frames}` : ""}
          </p>
          {info.platform || info.deadline ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {info.platform ? <Chip>{info.platform}</Chip> : null}
              {info.deadline ? <Chip>{info.deadline}</Chip> : null}
            </div>
          ) : null}
        </div>

        {missing.length && open ? (
          <p className="rounded-2xl border border-dashed border-line/15 px-4 py-3 text-[13px] leading-relaxed text-fog/60">
            Still to find out: {missing.join(", ")}.
          </p>
        ) : null}

        {info.screens.length ? (
          <Section title="Screens" count={info.screens.length} defaultOpen>
            <ul className="flex flex-wrap gap-1.5">
              {info.screens.map((screen) => (
                <li key={screen}>
                  <Chip>{screen}</Chip>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {hasMore ? (
          <Section title="Style and references" defaultOpen>
            <div className="space-y-4 text-[13px] leading-relaxed text-fog/80">
              {info.style ? <Field label="Style" text={info.style} /> : null}
              {info.references ? <Field label="References" text={info.references} /> : null}
              {info.extras ? <Field label="Extras" text={info.extras} /> : null}
            </div>
          </Section>
        ) : null}

        {brief.images.length ? (
          <Section title="Images" count={brief.images.length} defaultOpen>
            <ul className="grid grid-cols-3 gap-2">
              {brief.images.map((image) => (
                <li key={image.id}>
                  <a href={image.url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl border border-line/10 transition-transform hover:scale-[1.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="Reference" className="size-full object-cover" loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {info.summary ? (
          <Section title="Summary">
            <p className="whitespace-pre-wrap text-pretty text-[13px] leading-relaxed text-fog/80">{info.summary}</p>
          </Section>
        ) : null}

        {open && brief.steer.length ? (
          <Section title="AI guidance" count={brief.steer.length} defaultOpen>
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {brief.steer.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex items-start justify-between gap-3 rounded-xl border border-line/10 bg-white/[0.03] px-3 py-2.5 text-[13px] leading-relaxed text-fog/85"
                  >
                    <span className="min-w-0 break-words">{item.note}</span>
                    <button type="button" disabled={busy} aria-label="Remove note" onClick={() => onUnsteer(item.id)} className="shrink-0 text-fog/55 transition-colors hover:text-ink">
                      ×
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </Section>
        ) : null}
      </div>

      <div className="relative shrink-0 space-y-3 border-t border-line/10 bg-void/60 p-4 backdrop-blur-xl">
        {finished ? (
          <LayoutGroup id={`handled-${brief.id}`}>
            <div role="group" aria-label="Status" className="relative flex rounded-full border border-line/10 bg-void/40 p-1">
              {HANDLED.map((item) => {
                const active = brief.handled === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={busy}
                    aria-pressed={active}
                    onClick={() => !active && onHandled(item.key)}
                    className={cn("relative h-8 flex-1 rounded-full text-sm transition-colors", active ? "text-ink" : "text-fog/60 hover:text-ink")}
                  >
                    {active ? (
                      <motion.span layoutId="handled-pill" aria-hidden="true" className="absolute inset-0 rounded-full bg-white/[0.1]" transition={{ type: "spring", stiffness: 520, damping: 36 }} />
                    ) : null}
                    <span className="relative">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        ) : null}

        <div className="flex items-center gap-2">
          {link ? (
            <a
              href={link}
              onClick={() => finished && brief.handled === "new" && onHandled("replied")}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-ink text-sm font-medium text-void transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
            >
              Email {info.name ? info.name.split(" ")[0] : "them"}
            </a>
          ) : (
            <span className="flex h-11 flex-1 items-center justify-center rounded-full border border-line/10 text-sm text-fog/45">No email given</span>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((value) => !value)}
              aria-label="More actions"
              aria-expanded={menu}
              className="grid size-11 place-items-center rounded-full border border-line/15 text-fog/80 transition-colors hover:border-line/35 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
            <AnimatePresence>
              {menu ? (
                <>
                  <button type="button" aria-label="Close menu" onClick={() => { setMenu(false); setConfirm(null); }} className="fixed inset-0 z-10 cursor-default" />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: EASE }}
                    className="absolute bottom-full right-0 z-20 mb-2 w-52 origin-bottom-right overflow-hidden rounded-2xl border border-line/15 bg-[#121214] p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8)]"
                  >
                    {open ? (
                      <MenuItem
                        busy={busy}
                        label="End chat"
                        confirm={confirm === "end"}
                        onClick={() => (confirm === "end" ? (setMenu(false), setConfirm(null), onEnd()) : setConfirm("end"))}
                      />
                    ) : null}
                    <MenuItem
                      busy={busy}
                      danger
                      label="Delete conversation"
                      confirm={confirm === "delete"}
                      onClick={() => (confirm === "delete" ? (setMenu(false), setConfirm(null), onDelete()) : setConfirm("delete"))}
                    />
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, confirm, danger, busy }: { label: string; onClick: () => void; confirm: boolean; danger?: boolean; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-colors disabled:opacity-50",
        confirm ? (danger ? "bg-red-300/15 text-red-200" : "bg-white/[0.1] text-ink") : danger ? "text-red-200/80 hover:bg-red-300/10" : "text-fog/85 hover:bg-white/[0.06]",
      )}
    >
      {confirm ? "Tap again to confirm" : label}
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-line/10 bg-white/[0.04] px-3 py-1 text-[13px] text-fog/90">{children}</span>;
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-fog/50">{label}</p>
      <p className="whitespace-pre-wrap text-pretty">{text}</p>
    </div>
  );
}

/** A section that folds away, so a long brief stays scannable. */
function Section({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));
  return (
    <section className="rounded-2xl border border-line/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm text-fog/85 transition-colors hover:text-ink"
      >
        <span className="flex items-center gap-2">
          {title}
          {count ? <span className="text-xs tabular-nums text-fog/45">{count}</span> : null}
        </span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} viewBox="0 0 24 24" className="size-4 text-fog/50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
