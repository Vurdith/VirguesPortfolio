import { SITE } from "@/lib/site";

/** Offered once a brief or quote request is in: a way to keep seeing the work. Opens in a new tab so the chat stays. */
export function SubscribePrompt({ href }: { href: string }) {
  return (
    <aside
      aria-label="Discord updates"
      className="mx-auto flex max-w-md items-center gap-4 rounded-2xl border border-line/10 bg-white/[0.03] px-4 py-3"
    >
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-fog/80">
        <span className="block text-ink">Get {SITE.name}’s new work in your Discord</span>
        Subscribers also get free drops and invite rewards.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 shrink-0 items-center rounded-full border border-line/25 px-4 text-[11px] tracking-[0.22em] text-ink transition-colors hover:border-line/50"
      >
        SUBSCRIBE
      </a>
    </aside>
  );
}
