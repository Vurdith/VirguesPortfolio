import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === "production";

// Next.js inlines small scripts and styles, so those need 'unsafe-inline'. Everything else is
// locked to this origin plus the few services the site actually uses. Dev needs eval for HMR.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://va.vercel-scripts.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  // Admin uploads PUT straight to the storage bucket, whose host is configurable.
  "connect-src 'self' https: wss:",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

const r2Host = (() => {
  try {
    return process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // Lets a verification build run beside the dev server without touching its .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: projectRoot,
  env: {
    // Exposed to the browser so image URLs can be routed through the optimizer.
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL ?? "",
  },
  images: {
    qualities: [75, 82, 100],
    // Uploaded work images live in R2; allow the optimizer to resize them.
    remotePatterns: r2Host ? [{ protocol: "https", hostname: r2Host }] : [],
  },
  async headers() {
    const staticAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/hero/:path*", headers: staticAssetHeaders },
      { source: "/uploads/:path*", headers: staticAssetHeaders },
      { source: "/music/:path*", headers: staticAssetHeaders },
      { source: "/noise.svg", headers: staticAssetHeaders },
      { source: "/intro-snap-hq.mp4", headers: staticAssetHeaders },
      { source: "/intro-snap-720.mp4", headers: staticAssetHeaders },
      { source: "/intro-snap-poster.webp", headers: staticAssetHeaders },
      { source: "/intro-snap-tail.m4a", headers: staticAssetHeaders },
      { source: "/og.jpg", headers: staticAssetHeaders },
      { source: "/ayanakoji-profile-320.webp", headers: staticAssetHeaders },
    ];
  },
};

export default nextConfig;
