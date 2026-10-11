import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

import { ClientChrome } from "@/components/ClientChrome";
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

const TITLE = `${SITE.name} — Senior UI/UX Engineer • Creative Developer`;
const DESCRIPTION =
  "A monochrome cinematic-noir portfolio: strict grids, premium motion, tactile interactions.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: TITLE,
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
        <Providers>
          <ClientChrome />
          {children}
        </Providers>
      </body>
    </html>
  );
}
