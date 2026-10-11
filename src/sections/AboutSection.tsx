import Image from "next/image";

import { CornerMarks } from "@/components/CornerMarks";
import { MonoIcon } from "@/components/MonoIcon";
import { RevealHeading } from "@/components/RevealHeading";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

const PRINCIPLES = [
  {
    n: "01",
    title: "Design and build in one place",
    body: "The person who designs the interface also implements it, so what you approve is what ships.",
  },
  {
    n: "02",
    title: "Short feedback loops",
    body: "You see work in progress, not a big reveal at the end. Direction changes are cheap early.",
  },
  {
    n: "03",
    title: "Clean handoff",
    body: "Named, grouped, documented files that drop into your project without creating extra work.",
  },
] as const;

export function AboutSection({ className }: { className?: string }) {
  return (
    <section
      id="about"
      className={cn("relative overflow-hidden py-20 md:py-28", className)}
      aria-label="About"
    >
      <div aria-hidden="true" className="section-grid-bg" />
      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-fog/70">
              <MonoIcon name="frame" className="size-4" />
              <span>ABOUT</span>
            </div>
            <RevealHeading className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
              Interfaces that ship.
            </RevealHeading>

            <div className="relative mt-10 w-40 border border-line/15 bg-void/40 p-1.5">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={SITE.profileImage}
                  alt={`${SITE.name}, UI designer and developer`}
                  fill
                  sizes="160px"
                  className="object-cover grayscale"
                />
              </div>
              <CornerMarks className="opacity-80" />
            </div>
          </div>

          <div className="md:col-span-7">
            <p className="text-pretty font-serif text-2xl leading-snug tracking-[-0.03em] text-ink md:text-3xl">
              I’m {SITE.name}, a UI designer who also writes the code.
            </p>
            <p className="mt-6 max-w-prose text-pretty text-sm leading-relaxed text-fog/80 md:text-base">
              Most projects start as a design problem: a menu that’s confusing, a HUD that fights the
              player, a product screen that doesn’t explain itself. They end as working interface, in
              your game engine or in the browser. Doing both halves means nothing gets lost between
              the design and the build.
            </p>

            <ul className="mt-10 border-t border-line/12">
              {PRINCIPLES.map((item) => (
                <li key={item.n} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line/12 py-5">
                  <span className="pt-0.5 text-[10px] tabular-nums tracking-[0.22em] text-fog/72">{item.n}</span>
                  <div>
                    <h3 className="font-serif text-xl leading-tight tracking-[-0.03em]">{item.title}</h3>
                    <p className="mt-1.5 max-w-prose text-pretty text-sm leading-relaxed text-fog/80">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
