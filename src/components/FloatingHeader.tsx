"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { useUiSounds } from "@/hooks/useUiSounds";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

const NAV = [
  { label: "WORK", href: "/#work" },
  { label: "SERVICES", href: "/#offerings" },
  { label: "PROCESS", href: "/#process" },
  { label: "REVIEWS", href: "/#reviews" },
  { label: "PAYMENT", href: "/#payment" },
  { label: "CONTACT", href: "/#contact" },
] as const;

const LEFT_NAV = NAV.slice(0, 3);
const RIGHT_NAV = NAV.slice(3);
const VIZ_BARS = 20;

type BarStyle = React.CSSProperties & {
  "--a": string;
};

export function FloatingHeader({ className }: { className?: string }) {
  const { playHover, playClick } = useUiSounds();
  const { scrollY } = useScroll();

  const [hoveredHref, setHoveredHref] = React.useState<string | null>(null);

  const y = useSpring(useTransform(scrollY, [0, 180], [0, -4]), {
    stiffness: 520,
    damping: 54,
    mass: 0.7,
  });
  const scale = useSpring(useTransform(scrollY, [0, 180], [1, 0.985]), {
    stiffness: 520,
    damping: 54,
    mass: 0.7,
  });
  const opacity = useSpring(useTransform(scrollY, [0, 180], [1, 0.96]), {
    stiffness: 520,
    damping: 54,
    mass: 0.7,
  });

  const handleMouseEnter = (href: string) => {
    setHoveredHref(href);
    playHover();
  };

  const handleProfileHover = () => {
    setHoveredHref(null);
    playHover();
  };

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-6 z-50 flex justify-center px-3",
        "transform-gpu will-change-transform",
        className
      )}
      style={{ y, scale, opacity }}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.85, ease: [0.2, 0.85, 0.2, 1] }}
    >
      <nav
        className="tc-nav pointer-events-auto relative grid w-fit max-w-[calc(100vw-1.25rem)] grid-cols-[300px_76px_300px] items-center justify-center gap-3 overflow-visible border border-white/10 bg-black/75 px-3 py-2"
        aria-label="Primary"
        onMouseLeave={() => setHoveredHref(null)}
      >
        <CornerFrame />

        <div className="nav-group nav-group-left relative z-10 flex justify-end gap-3">
          {LEFT_NAV.map((item) => (
            <NavItem
              item={item}
              key={item.href}
              hovered={hoveredHref === item.href}
              onHover={handleMouseEnter}
              onClick={playClick}
            />
          ))}
        </div>

        <div aria-hidden="true" className="relative z-0 h-9 w-full" />
        <ProfileHome onClick={playClick} onHover={handleProfileHover} />

        <div className="nav-group nav-group-right relative z-10 flex justify-start gap-3">
          {RIGHT_NAV.map((item) => (
            <NavItem
              item={item}
              key={item.href}
              hovered={hoveredHref === item.href}
              onHover={handleMouseEnter}
              onClick={playClick}
            />
          ))}
        </div>

        <style jsx global>{`
          .tc-nav {
            border-radius: 0;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 18px 50px rgba(0, 0, 0, 0.36);
          }

          @media (max-width: 560px) {
            .tc-nav {
              grid-template-columns: 100px 62px 150px;
              width: auto;
              gap: 8px;
              padding: 7px 9px;
            }

            .tc-nav .nav-group {
              gap: 6px;
            }
          }

          .profile-home .profile-orbit {
            position: absolute;
            left: 50%;
            top: 50%;
            z-index: 1;
            height: 66px;
            width: 66px;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }

          .profile-home .viz-spoke {
            position: absolute;
            inset: 0;
            transform: rotate(var(--a));
            transform-origin: 50% 50%;
          }

          .profile-home .viz-bar {
            position: absolute;
            left: 50%;
            top: 0;
            width: 4px;
            height: 9px;
            border-radius: 1px;
            background: linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.92),
              rgba(255, 255, 255, 0.22)
            );
            border: 1px solid rgba(255, 255, 255, 0.24);
            box-shadow:
              0 0 9px rgba(255, 255, 255, 0.24),
              inset 0 0 5px rgba(255, 255, 255, 0.18);
            transform: translateX(-50%) scaleY(0.7);
            transform-origin: 50% 100%;
            mix-blend-mode: screen;
            animation-name: vizPulse;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
            will-change: transform, opacity;
          }

          @keyframes vizPulse {
            0% {
              transform: translateX(-50%) scaleY(0.42);
              opacity: 0.58;
            }
            22% {
              transform: translateX(-50%) scaleY(1.62);
              opacity: 0.95;
            }
            47% {
              transform: translateX(-50%) scaleY(0.58);
              opacity: 0.64;
            }
            50% {
              transform: translateX(-50%) scaleY(0.58);
              opacity: 0.64;
            }
            74% {
              transform: translateX(-50%) scaleY(1.34);
              opacity: 0.86;
            }
            100% {
              transform: translateX(-50%) scaleY(0.42);
              opacity: 0.58;
            }
          }

          @keyframes profileRing {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes profilePulse {
            0% {
              box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.28);
            }
            70% {
              box-shadow: 0 0 0 16px rgba(255, 255, 255, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
            }
          }

          @media (max-width: 720px) {
            .profile-home .profile-orbit {
              height: 56px;
              width: 56px;
            }

            .profile-home .viz-bar {
              height: 8px;
              width: 2px;
              top: 0;
              transform: translateX(-50%) scaleY(0.86);
              transform-origin: 50% 100%;
            }

            @keyframes vizPulse {
              0% {
                transform: translateX(-50%) scaleY(0.52);
                opacity: 0.68;
              }
              22% {
                transform: translateX(-50%) scaleY(1.46);
                opacity: 1;
              }
              47% {
                transform: translateX(-50%) scaleY(0.66);
                opacity: 0.74;
              }
              74% {
                transform: translateX(-50%) scaleY(1.26);
                opacity: 1;
              }
              100% {
                transform: translateX(-50%) scaleY(0.52);
                opacity: 0.68;
              }
            }
          }
        `}</style>
      </nav>
    </motion.header>
  );
}

function NavItem({
  item,
  hovered,
  onHover,
  onClick,
}: {
  item: (typeof NAV)[number];
  hovered: boolean;
  onHover: (href: string) => void;
  onClick: () => void;
}) {
  return (
    <Link
      href={item.href}
      onMouseEnter={() => onHover(item.href)}
      onClick={onClick}
      className={cn(
        "relative z-10 inline-flex h-8 w-[44px] min-w-0 items-center justify-center overflow-hidden border border-line/15 bg-void/70 px-2 text-[10px] tracking-[0.18em] text-fog/75 transition-colors duration-300 md:h-9 md:w-[92px]",
        hovered ? "border-line/35 text-ink" : "hover:border-line/30 hover:text-fog/95"
      )}
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative z-10 hidden md:inline">
        <ScrambleText isHovered={hovered} text={item.label} />
      </span>
      <span className="relative z-10 md:hidden">{item.label.slice(0, 1)}</span>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 border border-line/20 bg-white/[0.035] transition-all duration-300",
          hovered ? "opacity-100" : "opacity-0"
        )}
      />
      <span className="pointer-events-none absolute inset-0 opacity-75">
        <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-line/35" />
        <span className="absolute right-0 top-0 h-2 w-2 border-r border-t border-line/35" />
        <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-line/35" />
        <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-line/35" />
      </span>
    </Link>
  );
}

function ProfileHome({ onClick, onHover }: { onClick: () => void; onHover: () => void }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name} home`}
      title={`${SITE.name} home`}
      onClick={onClick}
      onMouseEnter={onHover}
      className="profile-home group absolute left-1/2 top-1/2 z-20 grid h-[50px] w-[50px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line/20 bg-black/85 shadow-[0_14px_34px_rgba(0,0,0,.45)] md:h-14 md:w-14"
    >
      <span aria-hidden="true" className="profile-orbit">
        {Array.from({ length: VIZ_BARS }).map((_, i) => {
          const sequence = [0, 7, 3, 11, 15, 5, 18, 2, 13, 9, 16, 4, 19, 1, 12, 6, 17, 8, 14, 10];
          const spokeStyle: BarStyle = {
            "--a": `${(360 / VIZ_BARS) * i}deg`,
          };
          const barStyle: React.CSSProperties = {
            animationDuration: `${1.85 + (sequence[i] % 6) * 0.14}s`,
            animationDelay: `${sequence[i] * -0.12}s`,
          };

          return (
            <span className="viz-spoke" key={i} style={spokeStyle}>
              <span className="viz-bar" style={barStyle} />
            </span>
          );
        })}
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[4px] rounded-full opacity-80"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(255,255,255,.08), rgba(255,255,255,.38), rgba(255,255,255,.08))",
          animation: "profileRing 3.2s linear infinite",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), black 0)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[7px] rounded-full opacity-70"
        style={{ animation: "profilePulse 2.2s ease-out infinite" }}
      />

      <span className="profile-image relative z-10 grid h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-black md:h-10 md:w-10">
        <Image
          src={SITE.profileImage}
          alt=""
          width={160}
          height={160}
          quality={100}
          unoptimized
          className="h-full w-full scale-[1.12] object-cover object-center"
          priority
        />
      </span>
    </Link>
  );
}

function ScrambleText({ text, isHovered }: { text: string; isHovered: boolean }) {
  const [display, setDisplay] = React.useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

  React.useEffect(() => {
    if (!isHovered) {
      setDisplay(text);
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((char, index) => {
            if (index < iteration) return text[index];
            if (char === " ") return " ";
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 30);

    return () => clearInterval(interval);
  }, [isHovered, text]);

  return <span>{display}</span>;
}

function CornerFrame() {
  return (
    <span className="pointer-events-none absolute inset-0 opacity-80">
      <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-line/30" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-line/30" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-line/30" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-line/30" />
      <span className="absolute left-0 top-1/2 h-px w-3 bg-line/10" />
      <span className="absolute right-0 top-1/2 h-px w-3 bg-line/10" />
    </span>
  );
}
