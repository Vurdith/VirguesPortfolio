import type { Metadata } from "next";
import Link from "next/link";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { CornerMarks } from "@/components/CornerMarks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Brief your project",
  description: `Tell ${SITE.name}'s AI assistant what you need and get a price per frame.`,
  alternates: { canonical: "/chat" },
  // A tool for customers, not a page to find in search results.
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <main id="main" tabIndex={-1} className="film-grain vignette flex h-dvh flex-col outline-none">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col md:py-6">
        <div className="relative flex min-h-0 flex-1 flex-col border-line/18 bg-[#0c0c0d] md:border">
          <CornerMarks className="hidden opacity-80 md:block" />
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/10 px-4 py-4 md:px-8 md:py-5">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.22em] text-fog/70">AI ASSISTANT</p>
              <h1 className="mt-1.5 font-serif text-2xl leading-[0.95] tracking-[-0.05em] md:text-3xl">Brief your project.</h1>
            </div>
            <Link
              href="/"
              className="inline-flex h-11 shrink-0 items-center gap-2 border border-line/18 bg-void/40 px-4 text-[11px] tracking-[0.22em] text-fog/80 transition-colors hover:border-line/35 hover:text-ink"
            >
              <span aria-hidden="true">←</span>
              <span>{SITE.name.toUpperCase()}</span>
            </Link>
          </header>
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}
