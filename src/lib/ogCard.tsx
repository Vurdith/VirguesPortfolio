import { ImageResponse } from "next/og";

import { SITE } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };

type Card = {
  /** Short page name shown in the corner, such as "CHAT". */
  label: string;
  title: string;
  line: string;
  /** SVG path data on a 24 by 24 grid, drawn as a line icon. */
  icon: string[];
};

/** One of the site's faces, cut down to the letters needed. Without it the card falls back to the default face. */
async function face(name: "Instrument Serif" | "Instrument Sans", text: string) {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${name.replace(" ", "+")}&text=${encodeURIComponent(text)}`).then((res) => res.text());
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return [];
    const data = await fetch(url).then((res) => res.arrayBuffer());
    return [{ name, data, weight: 400 as const, style: "normal" as const }];
  } catch {
    return [];
  }
}

const INK = "#f4f4f2";
const FOG = "rgba(244,244,242,0.62)";
const LINE = "rgba(244,244,242,0.28)";

function Corner({ at }: { at: { top?: number; bottom?: number; left?: number; right?: number } }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 22,
        height: 22,
        ...at,
        borderTop: at.top === undefined ? "none" : `2px solid ${INK}`,
        borderBottom: at.bottom === undefined ? "none" : `2px solid ${INK}`,
        borderLeft: at.left === undefined ? "none" : `2px solid ${INK}`,
        borderRight: at.right === undefined ? "none" : `2px solid ${INK}`,
      }}
    />
  );
}

/** The link-preview image for a page: the site's frame, the page's name, and an icon that tells pages apart. */
export async function ogCard({ label, title, line, icon }: Card) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 48,
          backgroundColor: "#0a0a0b",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          color: INK,
          fontFamily: "Instrument Sans",
        }}
      >
        <div style={{ position: "relative", display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between", border: `1px solid ${LINE}`, padding: "44px 56px" }}>
          <Corner at={{ top: -1, left: -1 }} />
          <Corner at={{ top: -1, right: -1 }} />
          <Corner at={{ bottom: -1, left: -1 }} />
          <Corner at={{ bottom: -1, right: -1 }} />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 6, color: FOG }}>
            <span>{SITE.name.toUpperCase()}</span>
            <span>{label}</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
              <div style={{ fontFamily: "Instrument Serif", fontSize: 112, lineHeight: 0.95, letterSpacing: -4 }}>{title}</div>
              <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: FOG }}>{line}</div>
            </div>
            <svg width="230" height="230" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
              {icon.map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: (await Promise.all([face("Instrument Sans", `${SITE.name.toUpperCase()}${label}${line}`), face("Instrument Serif", title)])).flat() },
  );
}
