"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useSpring, useTransform } from "framer-motion";

import { CornerMarks } from "@/components/CornerMarks";
import { MobileNav, type MobileNavItem } from "@/components/MobileNav";
import { cn } from "@/lib/cn";
import { usePageScroll } from "@/hooks/usePageScroll";
import { SITE } from "@/lib/site";
import { useCurrentSection } from "@/hooks/useCurrentSection";
import { useUiSounds } from "@/hooks/useUiSounds";

type NavItemData = {
  label: string;
  /** Shorter wording for phones; still a real word, never an initial. */
  short: string;
  href: string;
  /** Page sections that count as "you are here" for this link. */
  sections: readonly string[];
  cta?: boolean;
};

// Process and payment live under Services: they explain how the work is done and paid for.
const LEFT_NAV: readonly NavItemData[] = [
  { label: "WORK", short: "WORK", href: "/#work", sections: ["work"] },
  { label: "SERVICES", short: "SERVICES", href: "/#offerings", sections: ["offerings", "process", "payment"] },
];
const RIGHT_NAV: readonly NavItemData[] = [
  { label: "REVIEWS", short: "REVIEWS", href: "/#reviews", sections: ["reviews"] },
  { label: "GET A QUOTE", short: "QUOTE", href: "/#quote", sections: ["contact"], cta: true },
];
// On a phone the links live in a side menu, where there is room for every section.
const MOBILE_NAV: readonly MobileNavItem[] = [
  { label: "Work", hint: "Selected interfaces", href: "/#work", sections: ["work"] },
  { label: "Services", hint: "What I do and what it costs", href: "/#offerings", sections: ["offerings"] },
  { label: "Process", hint: "How a project runs", href: "/#process", sections: ["process"] },
  { label: "Payment", hint: "Ways to pay", href: "/#payment", sections: ["payment"] },
  { label: "Reviews", hint: "What clients said", href: "/#reviews", sections: ["reviews"] },
  { label: "Contact", hint: "Email, Discord, X", href: "/#contact", sections: ["contact"] },
];
const TRACKED_SECTIONS = [...LEFT_NAV, ...RIGHT_NAV].flatMap((item) => item.sections);

const VIZ_BARS = 20;
const VIZ_SEQUENCE = [0, 7, 3, 11, 15, 5, 18, 2, 13, 9, 16, 4, 19, 1, 12, 6, 17, 8, 14, 10] as const;
const PROFILE_BARS = Array.from({ length: VIZ_BARS }, (_, i) => ({
  angle: `${(360 / VIZ_BARS) * i}deg`,
  duration: `${1.85 + (VIZ_SEQUENCE[i] % 6) * 0.14}s`,
  delay: `${VIZ_SEQUENCE[i] * -0.12}s`,
}));

const SPRING = { stiffness: 520, damping: 54, mass: 0.7 } as const;

type SpokeStyle = React.CSSProperties & { "--a": string };

export function FloatingHeader({ className }: { className?: string }) {
  const { scrollY } = usePageScroll();
  const current = useCurrentSection(TRACKED_SECTIONS);

  // One spring drives the small "settle" effect applied once the page starts scrolling.
  const settle = useSpring(useTransform(scrollY, [0, 180], [0, 1]), SPRING);
  const y = useTransform(settle, [0, 1], [0, -4]);
  const scale = useTransform(settle, [0, 1], [1, 0.985]);
  const opacity = useTransform(settle, [0, 1], [1, 0.96]);

  return (
    <>
      <PhoneHeader current={current} />
      <DesktopHeader className={className} current={current} style={{ y, scale, opacity }} />
    </>
  );
}

function DesktopHeader({ className, current, style }: { className?: string; current: string | null; style: React.ComponentProps<typeof motion.header>["style"] }) {
  return (
    <motion.header
      className={cn(
        "max-md:hidden",
        "fixed inset-x-0 top-3 z-50 flex justify-center px-3 md:top-6",
        "transform-gpu will-change-transform",
        className,
      )}
      style={style}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.85, ease: [0.2, 0.85, 0.2, 1] }}
    >
      <nav
        className="tc-nav pointer-events-auto relative hidden w-fit max-w-[calc(100vw-1.25rem)] grid-cols-[280px_76px_280px] items-center justify-center gap-3 overflow-visible border border-white/10 bg-black/75 px-3 py-2 md:grid"
        aria-label="Primary"
      >
        <CornerMarks className="opacity-80" />
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-px w-3 bg-line/10" />
        <span aria-hidden="true" className="absolute right-0 top-1/2 h-px w-3 bg-line/10" />

        <div className="nav-group relative z-10 grid grid-cols-2 gap-3">
          {LEFT_NAV.map((item) => (
            <NavItem item={item} key={item.href} active={current !== null && item.sections.includes(current)} />
          ))}
        </div>

        <div aria-hidden="true" className="relative z-0 h-9 w-full" />
        <ProfileHome />

        <div className="nav-group relative z-10 grid grid-cols-2 gap-3">
          {RIGHT_NAV.map((item) => (
            <NavItem item={item} key={item.href} active={current !== null && item.sections.includes(current)} />
          ))}
        </div>
      </nav>
    </motion.header>
  );
}

/** The phone header sits outside the animated wrapper: a transformed parent would trap its full-screen menu. */
function PhoneHeader({ current }: { current: string | null }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 px-3 md:hidden">
      <MobileNav items={MOBILE_NAV} current={current} quoteHref="/#quote" />
    </header>
  );
}

const NavItem = React.memo(function NavItem({ item, active }: { item: NavItemData; active: boolean }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link
      href={item.href}
      aria-current={active ? "location" : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn(
        "relative z-10 inline-flex h-11 min-w-0 items-center justify-center overflow-hidden border px-1 text-[9px] tracking-[0.06em] transition-colors duration-300 md:h-10 md:px-3 md:text-[11px] md:tracking-[0.18em]",
        "border-line/15 bg-void/70",
        item.cta ? "border-line/40 bg-white/[0.07] text-ink" : active ? "border-line/45 text-ink" : "text-fog/90",
        hovered ? "border-line/35 text-ink" : "hover:border-line/30",
      )}
    >
      <span className="relative z-10 hidden whitespace-nowrap md:inline">
        <ScrambleText active={hovered} text={item.label} />
      </span>
      <span className="relative z-10 md:hidden">{item.short}</span>
      <>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 border border-line/20 bg-white/[0.035] transition-opacity duration-300",
            hovered ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-2 bottom-0 h-px origin-left bg-ink transition-transform duration-300",
            active ? "scale-x-100" : "scale-x-0",
          )}
        />
        <CornerMarks size={2} tone="border-line/35" className="opacity-75" />
      </>
    </Link>
  );
});

const ProfileHome = React.memo(function ProfileHome() {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} home`}
      title={`${SITE.name} home`}
      className="profile-home group absolute left-1/2 top-1/2 z-20 grid h-[50px] w-[50px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line/20 bg-black/85 shadow-[0_14px_34px_rgba(0,0,0,.45)] md:h-14 md:w-14"
    >
      <span aria-hidden="true" className="profile-orbit">
        {PROFILE_BARS.map((bar, i) => {
          const spokeStyle: SpokeStyle = { "--a": bar.angle };
          return (
            <span className="viz-spoke" key={i} style={spokeStyle}>
              <span
                className="viz-bar"
                style={{ animationDuration: bar.duration, animationDelay: bar.delay }}
              />
            </span>
          );
        })}
      </span>

      <span aria-hidden="true" className="profile-ring" />
      <span aria-hidden="true" className="profile-pulse" />

      <span className="profile-image relative z-10 grid h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-black md:h-10 md:w-10">
        <Image
          src={SITE.profileImage}
          alt=""
          width={160}
          height={160}
          quality={82}
          className="h-full w-full scale-[1.12] object-cover object-center"
          priority
        />
      </span>
    </Link>
  );
});

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
const SCRAMBLE_TICK_MS = 26;
const SCRAMBLE_REVEAL_PER_TICK = 1 / 2;

/** Shows `text`, scrambling its letters and settling left to right while `active` is true. */
function useScrambledText(text: string, active: boolean) {
  const { playTick } = useUiSounds();
  const [display, setDisplay] = React.useState(text);

  React.useEffect(() => {
    if (!active) {
      setDisplay(text);
      return;
    }

    let revealed = 0;
    let lastLetters = 0;
    const timer = window.setInterval(() => {
      // One soft tick as each new letter locks in.
      const letters = Math.floor(revealed);
      if (letters > lastLetters) {
        lastLetters = letters;
        playTick();
      }

      setDisplay(
        Array.from(text, (char, index) =>
          index < revealed || char === " "
            ? char
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
        ).join(""),
      );

      if (revealed >= text.length) window.clearInterval(timer);
      revealed += SCRAMBLE_REVEAL_PER_TICK;
    }, SCRAMBLE_TICK_MS);

    return () => window.clearInterval(timer);
  }, [active, text, playTick]);

  return display;
}

function ScrambleText({ text, active }: { text: string; active: boolean }) {
  return <span>{useScrambledText(text, active)}</span>;
}
