import type { Metadata } from "next";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { SITE } from "@/lib/site";

const TITLE = `Brief your project — ${SITE.name}`;
const DESCRIPTION = `Tell ${SITE.name}'s AI assistant what you need and get a price per frame.`;

export const metadata: Metadata = {
  title: "Brief your project",
  description: DESCRIPTION,
  alternates: { canonical: "/chat" },
  // Its own animated card (built by scripts/og-chat-card.py), so a link to the chat does not look like the home page.
  openGraph: {
    type: "website",
    url: `${SITE.url}/chat`,
    siteName: SITE.name,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-chat.gif", width: 1200, height: 630, type: "image/gif", alt: "Brief your project." }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-chat.gif"] },
  // A tool for customers, not a page to find in search results.
  robots: { index: false, follow: false },
};

export default function ChatPage() {
  return (
    <main id="main" tabIndex={-1} className="film-grain vignette flex h-dvh flex-col outline-none">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col md:py-6">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-line/20 bg-[#0c0c0d] md:rounded-3xl md:border">
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}
