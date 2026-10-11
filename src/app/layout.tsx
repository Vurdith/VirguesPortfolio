import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { Providers } from "./providers";

import { ClientChrome } from "@/components/ClientChrome";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/site";

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

const TITLE = `${SITE.name} — UI Designer & Developer`;
const DESCRIPTION =
  "UI designer and developer. Custom interface design, game UI, asset imports, and polish for games and interface-heavy launches.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: `%s — ${SITE.name}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: SITE.heroImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SITE.heroImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh bg-void font-sans text-ink antialiased">
        <a
          href="#main"
          className="fixed left-4 top-4 z-[400] -translate-y-20 border border-line/30 bg-void px-4 py-2 text-xs tracking-[0.22em] text-ink transition-transform focus:translate-y-0"
        >
          SKIP TO CONTENT
        </a>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": `${SITE.url}/#website`,
                url: SITE.url,
                name: SITE.name,
                description: DESCRIPTION,
              },
              {
                "@type": "ProfessionalService",
                "@id": `${SITE.url}/#service`,
                name: SITE.name,
                url: SITE.url,
                email: SITE.email,
                image: `${SITE.url}${SITE.heroImage}`,
                description: DESCRIPTION,
                sameAs: Object.values(SITE.socials),
                knowsAbout: ["UI design", "Game UI", "Web development", "Motion design"],
              },
            ],
          }}
        />
        <Providers>
          <ClientChrome />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
