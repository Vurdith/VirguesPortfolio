import type * as React from "react";

import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { cn } from "@/lib/cn";
import { FALLBACK_REWARDS, MIN_SUBSCRIBERS_SHOWN, type DiscordInviter, type DiscordReward, type DiscordStats } from "@/lib/discordRewards";
import { SITE } from "@/lib/site";

const plural = (n: number, word: string) => `${n.toLocaleString("en-GB")} ${word}${n === 1 ? "" : "s"}`;

const STEPS = [
  { title: "Subscribe", line: "Each new work reaches you as a Discord message, with a free UI pack now and then." },
  { title: "Invite", line: "Run /invite in a direct message. Everyone who subscribes from it earns you one point." },
  { title: "Spend", line: "Points buy vouchers and services for your next commission. Your invite count never drops." },
] as const;

/** Rewards as the service lists them, split wherever the kind changes, so vouchers sit together. */
function runs(rewards: DiscordReward[]) {
  const all: { kind: DiscordReward["kind"]; rewards: DiscordReward[] }[] = [];
  for (const reward of rewards) {
    const last = all.at(-1);
    if (last?.kind === reward.kind) last.rewards.push(reward);
    else all.push({ kind: reward.kind, rewards: [reward] });
  }
  return all;
}

/**
 * What subscribing on Discord gets you: how the invite rewards work, what points buy, the people
 * who invited the most and what subscribers were given for free. Renders nothing unless the
 * Discord service answered.
 */
export function RewardsSection({
  stats,
  subscribeUrl,
  className,
}: {
  stats: DiscordStats | null;
  subscribeUrl: string | null;
  className?: string;
}) {
  if (!stats || !subscribeUrl) return null;
  const rewards = stats.rewards.length ? stats.rewards : FALLBACK_REWARDS;

  return (
    <section
      id="rewards"
      className={cn("relative overflow-hidden border-t border-line/10 py-20 md:py-28", className)}
      aria-label="Discord rewards"
    >
      <div aria-hidden="true" className="section-grid-bg" />

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <header className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="bell" className="size-4" />
              <span>DISCORD</span>
            </div>
            <RevealHeading className="mt-3 origin-left font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">Subscribers.</RevealHeading>
          </div>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-fog/80 md:col-span-7 md:justify-self-end">
            Get each new work in your Discord. Bring other developers with you and the points come off your next commission.
          </p>
        </header>

        {stats.subscribers >= MIN_SUBSCRIBERS_SHOWN ? (
          <p className="mt-8 border-y border-line/10 py-4 font-serif text-2xl leading-tight tracking-[-0.04em] md:text-3xl">
            {stats.subscribers.toLocaleString("en-GB")} developers get {SITE.name}’s work in their Discord.
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          <div className="perf-card relative border border-line/12 bg-void/30 p-6 lg:sticky lg:top-24 lg:col-span-4">
            <CornerMarks size={4} tone="border-line/25" className="opacity-60" />
            <div className="relative">
              <p className="text-[11px] tracking-[0.28em] text-fog/72">HOW IT WORKS</p>
              <div className="mt-5 grid gap-4">
                {STEPS.map((step, index) => (
                  <div key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-line/8 pt-4">
                    <span aria-hidden="true" className="font-serif text-2xl leading-none tracking-[-0.04em] text-fog/55">0{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-serif text-xl leading-none tracking-[-0.03em] text-ink/95">{step.title}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-fog/72">{step.line}</span>
                    </span>
                  </div>
                ))}
              </div>
              <a
                href={subscribeUrl}
                rel="noopener"
                className="group relative mt-6 flex items-center justify-between gap-3 border border-line/30 bg-ink px-4 py-3.5 text-xs tracking-[0.22em] text-void transition-colors hover:bg-ink/90"
              >
                <span>SUBSCRIBE ON DISCORD</span>
                <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
              <p className="mt-3 text-[11px] leading-relaxed text-fog/60">Free. Every message has an unsubscribe button.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:col-span-8">
            <div className="flex items-baseline justify-between gap-4 border-b border-line/10 pb-3">
              <h3 className="font-serif text-2xl leading-none tracking-[-0.04em]">What points buy</h3>
              <p className="text-[11px] tracking-[0.22em] text-fog/72">ONE INVITE, ONE POINT</p>
            </div>
            {runs(rewards).map((run, index) =>
              run.kind === "voucher" ? (
                <ul key={index} className="grid gap-4 sm:grid-cols-3">
                  {run.rewards.map((reward) => (
                    <Voucher key={`${reward.cost}-${reward.title}`} reward={reward} />
                  ))}
                </ul>
              ) : (
                <ul key={index} className={cn("grid gap-4", run.rewards.length > 1 && "sm:grid-cols-2")}>
                  {run.rewards.map((reward) => (
                    <Service key={`${reward.cost}-${reward.title}`} reward={reward} />
                  ))}
                </ul>
              ),
            )}
          </div>
        </div>

        {stats.wall.length ? (
          <Panel eyebrow="Top inviters" title="The wall" className="mt-4">
            <ol className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.wall.map((inviter, index) => (
                <Inviter key={`${index}-${inviter.name}`} inviter={inviter} />
              ))}
            </ol>
          </Panel>
        ) : null}

        {stats.drops.length ? (
          <Panel eyebrow="Free for subscribers" title="Drops" className="mt-4">
            <ul className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {stats.drops.map((drop) => (
                <li key={`${drop.at}-${drop.title}`} className="flex items-center gap-3 text-xs leading-relaxed text-fog/72">
                  <span aria-hidden="true" className="h-px w-5 shrink-0 bg-line/25" />
                  <span>{drop.title}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </section>
  );
}

const TILE = "perf-card relative flex flex-col border border-line/12 bg-void/30 p-5 transition-colors hover:border-line/25";

/** The price of a reward: one mark per point, and the number. */
function Cost({ cost }: { cost: number }) {
  return (
    <span className="mt-auto block pt-5">
      <span className="flex items-center justify-between gap-3 border-t border-line/8 pt-3">
        <span aria-hidden="true" className="flex shrink-0 gap-0.5">
          {Array.from({ length: Math.min(cost, 12) }, (_, index) => (
            <span key={index} className="size-[5px] bg-ink/80" />
          ))}
        </span>
        <span className="shrink-0 text-[11px] tracking-[0.16em] text-ink/85">{plural(cost, "point").toUpperCase()}</span>
      </span>
    </span>
  );
}

/** A voucher leads with its number. One whose title names no percentage is shown by its title. */
function Voucher({ reward }: { reward: DiscordReward }) {
  const percent = /^(\d{1,3})%/.exec(reward.title)?.[1];
  return (
    <li className={TILE}>
      <CornerMarks size={3} tone="border-line/25" className="opacity-60" />
      <span className="text-[11px] tracking-[0.28em] text-fog/72">VOUCHER</span>
      {percent ? (
        <>
          <span className="sr-only">{reward.title}</span>
          <span aria-hidden="true" className="mt-4 font-serif text-6xl leading-[0.85] tracking-[-0.06em]">
            {percent}
            <span className="ml-0.5 text-3xl text-fog/60">%</span>
          </span>
        </>
      ) : (
        <span className="mt-4 font-serif text-2xl leading-none tracking-[-0.04em]">{reward.title}</span>
      )}
      {reward.detail ? <span className="mt-3 block text-xs leading-relaxed text-fog/72">{reward.detail}</span> : null}
      <Cost cost={reward.cost} />
    </li>
  );
}

function Service({ reward }: { reward: DiscordReward }) {
  return (
    <li className={TILE}>
      <CornerMarks size={3} tone="border-line/25" className="opacity-60" />
      <span className="text-[11px] tracking-[0.28em] text-fog/72">SERVICE</span>
      <span className="mt-3 font-serif text-2xl leading-none tracking-[-0.04em]">{reward.title}</span>
      {reward.detail ? <span className="mt-2 block text-xs leading-relaxed text-fog/72">{reward.detail}</span> : null}
      <Cost cost={reward.cost} />
    </li>
  );
}

function Inviter({ inviter }: { inviter: DiscordInviter }) {
  return (
    <li className="flex items-center gap-3 border-t border-line/8 pt-3">
      {inviter.avatar ? (
        // A Discord avatar: served as it is, and Discord is not told which page asked for it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={inviter.avatar}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-10 shrink-0 border border-line/15 bg-black/25 object-cover"
        />
      ) : (
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center border border-line/15 bg-black/25 font-serif text-lg text-fog/70">
          {inviter.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink/90">{inviter.name}</span>
        {inviter.rank ? <span className="block truncate text-[11px] tracking-[0.16em] text-fog/72">{inviter.rank.toUpperCase()}</span> : null}
      </span>
      <span className="shrink-0 text-[11px] tracking-[0.16em] text-fog/72">{plural(inviter.invites, "invite").toUpperCase()}</span>
    </li>
  );
}

function Panel({
  title,
  eyebrow,
  className,
  children,
}: {
  title: string;
  eyebrow: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("perf-card relative overflow-hidden border border-line/12 bg-void/30 p-5", className)}>
      <CornerMarks size={4} tone="border-line/25" className="opacity-60" />
      <div className="relative">
        <p className="text-[11px] tracking-[0.28em] text-fog/72">{eyebrow.toUpperCase()}</p>
        <h3 className="mt-2 font-serif text-2xl leading-none tracking-[-0.04em]">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
