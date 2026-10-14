import type { Metadata } from "next";
import Link from "next/link";

import { SITE } from "@/lib/site";

const TITLE = `Privacy — ${SITE.name}`;
const DESCRIPTION = `What ${SITE.name} stores when you send a quote request, a review or use the assistant, and why.`;

export const metadata: Metadata = {
  title: "Privacy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", url: `${SITE.url}/privacy`, siteName: SITE.name, title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const SECTIONS = [
  {
    title: "Quote requests",
    body: [
      "When you send a quote request I store what you type: your name, the way you asked me to reply (email, Discord and/or X), the project details, budget and timeline.",
      "I use it only to reply to you and to keep a record of the conversation. Nothing is sold or shared for marketing.",
      "To stop spam, I also keep a scrambled (hashed) version of your IP address next to the request. It cannot be turned back into your address and is deleted after a day or two.",
    ],
  },
  {
    title: "Reviews",
    body: [
      "If you leave a review, your name, rating, message and any images you attach are stored and shown on the site only after I approve them. Images are re-saved without their metadata (such as location data) and limited to 4 per review.",
      "You get a private key that stays in your browser, so only you can add replies to your review later. Only a scrambled copy of it is stored here. My replies and yours appear in the review's thread once approved.",
      "To stop spam, a scrambled (hashed) version of your IP address is kept next to a review for a day or two, then deleted.",
    ],
  },
  {
    title: "AI assistant",
    body: [
      "If you use the assistant to brief a project, your messages and any reference images you attach are stored so I can read the full brief, and they are sent to an AI model provider (through OpenRouter) to generate the replies. Do not share anything you would not want a service like that to process.",
      "A conversation is kept with the contact details you give, the price discussed and the images. Images are re-saved without their metadata. Prices the assistant mentions are guides; I confirm the final price myself.",
      "To allow one conversation at a time per connection, a scrambled (hashed) version of your IP address is kept next to the conversation, and a cookie in your browser links you back to it for up to a day.",
    ],
  },
  {
    title: "Discord updates",
    body: [
      "If you subscribe to new work on Discord, you authorise an app that sees your Discord username, id and avatar, adds you to my server and sends you a direct message when I publish a work. Your id, name and username are stored. Every message has an unsubscribe button.",
      "If you invite people who subscribe, your invite count, your points and anything you buy with them are kept with your id, so they stay yours. You appear on the public wall of top inviters only if you switch that on inside Discord. Ask and I will delete all of it.",
      "Subscribers may get a free drop now and then. If you asked for a quote and gave your Discord handle, you may also get one follow-up message there, and only one.",
    ],
  },
  {
    title: "On your device",
    body: [
      "The site saves a few preferences in your browser: whether sound and motion are on, whether you have seen the intro, an unsent quote draft so a refresh does not lose your message, and the private key for any review you wrote. They never leave your device (the key is only sent back to prove a reply is yours), and the draft is removed once you send it.",
    ],
  },
  {
    title: "Analytics and hosting",
    body: [
      "Visits are counted with Vercel Web Analytics, which does not use cookies or track you across sites. The site is hosted on Vercel; data is stored in Google Firestore and files in Cloudflare R2.",
    ],
  },
  {
    title: "Your choices",
    body: [
      `You can ask me to see, correct or delete anything I hold about you by emailing ${SITE.email}. I will reply within a few days.`,
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <main id="main" tabIndex={-1} className="film-grain vignette min-h-dvh px-6 py-16 outline-none md:px-10 md:py-20">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs tracking-[0.22em] text-fog/72 hover:text-ink">
          ← {SITE.name.toUpperCase()}
        </Link>
        <p className="mt-10 text-xs tracking-[0.22em] text-fog/72">PRIVACY</p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.92] tracking-[-0.06em] md:text-6xl">
          What I keep, and why.
        </h1>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[11px] tracking-[0.22em] text-fog/72">{section.title.toUpperCase()}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-pretty text-sm leading-relaxed text-fog/85 md:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
