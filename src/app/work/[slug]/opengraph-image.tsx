import { ImageResponse } from "next/og";

import { getPublicWorks } from "@/lib/db";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = `${SITE.name} — selected work`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Typographic share card per work. It deliberately avoids embedding the work's own image, since
 * the renderer cannot decode every format (webp) that uploads may use.
 */
export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = (await getPublicWorks()).find((w) => w.slug === slug);

  const title = work?.title ?? SITE.name;
  const tags = (work?.tags ?? []).slice(0, 4);
  const meta = [work?.client, work?.year ? String(work.year) : undefined].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#050505",
          backgroundImage:
            "radial-gradient(900px 500px at 85% 0%, rgba(255,255,255,0.14), transparent 60%)",
          color: "#f4f4f2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, letterSpacing: 6, color: "#9a9a96" }}>
          <span>{SITE.name.toUpperCase()}</span>
          <span>SELECTED WORK</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {meta ? (
            <div style={{ fontSize: 28, letterSpacing: 5, color: "#9a9a96", marginBottom: 24 }}>{meta.toUpperCase()}</div>
          ) : null}
          <div
            style={{
              fontSize: title.length > 28 ? 96 : 128,
              lineHeight: 0.95,
              letterSpacing: -4,
              fontFamily: "serif",
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                border: "1px solid rgba(255,255,255,0.28)",
                padding: "10px 18px",
                fontSize: 22,
                letterSpacing: 4,
                color: "#c9c9c5",
              }}
            >
              {tag.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
