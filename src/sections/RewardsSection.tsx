import type * as React from "react";

import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { cn } from "@/lib/cn";
import { FALLBACK_REWARDS, MIN_SUBSCRIBERS_SHOWN, type DiscordInviter, type DiscordStats } from "@/lib/discordRewards";
import { SITE } from "@/lib/site";

const plural = (n: number, word: string) => `${n.toLocaleString("en-GB")} ${word}${n === 1 ? "" : "s"}`;

/**
 * What subscribing on Discord gets you: the invite rewards, the people who invited the most and
 * what subscribers were given for free. Renders nothing unless the Discord service answered.
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
            Subscribe and each new work reaches you as a Discord message. Subscribers also get a free drop
            now and then, and a point for every person they invite who subscribes.
          </p>
        </header>

        {stats.subscribers >= MIN_SUBSCRIBERS_SHOWN ? (
          <p className="mt-8 border-y border-line/10 py-4 font-serif text-2xl leading-tight tracking-[-0.04em] md:text-3xl">
            {stats.subscribers.toLocaleString("en-GB")} developers get {SITE.name}’s work in their Discord.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Panel eyebrow="One point per invite" title="Invite rewards" className="lg:col-span-7">
            <ul className="grid gap-2">
              {rewards.map((reward) => (
                <li
                  key={`${reward.cost}-${reward.title}`}
                  className="grid grid-cols-[6.5rem_1fr] items-baseline gap-4 border-t border-line/8 pt-2"
                >
                  <span className="text-[11px] tracking-[0.16em] text-fog/72">{plural(reward.cost, "point").toUpperCase()}</span>
                  <span className="min-w-0">
                    <span className="block text-sm text-ink/90">{reward.title}</span>
                    {reward.detail ? <span className="mt-0.5 block text-xs leading-relaxed text-fog/72">{reward.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel eyebrow="Free" title="New work in your Discord" className="lg:col-span-5">
            <p className="text-xs leading-relaxed text-fog/72">
              One message when a work is published. Every message has an unsubscribe button.
            </p>
            <a
              href={subscribeUrl}
              rel="noopener"
              className="group relative mt-5 flex items-center justify-between gap-3 border border-line/18 bg-void/30 px-4 py-3 text-xs tracking-[0.22em] text-ink backdrop-blur-md transition-colors hover:border-line/35"
            >
              <span>SUBSCRIBE ON DISCORD</span>
              <span aria-hidden="true" className="text-fog/70 transition-transform duration-200 group-hover:translate-x-1">→</span>
              <CornerMarks className="opacity-80" />
            </a>
          </Panel>
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
