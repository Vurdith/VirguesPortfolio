import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

import { ClientChrome } from "@/components/ClientChrome";
import { LoadingScene } from "@/components/LoadingScene";
import { ParticleField } from "@/components/ParticleField";
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

export const metadata: Metadata = {
  title: `${SITE.name} — Senior UI/UX Engineer • Creative Developer`,
  description:
    "A monochrome cinematic-noir portfolio: strict grids, premium motion, tactile interactions.",
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
          <LoadingScene />
          <ParticleField />
          <ClientChrome />
          {children}
        </Providers>
      </body>
    </html>
  );
}
