import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Lets a verification build run beside the dev server without touching its .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: projectRoot,
  images: {
    qualities: [75, 82, 100],
  },
  async headers() {
    const staticAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];

    return [
      { source: "/hero/:path*", headers: staticAssetHeaders },
      { source: "/uploads/:path*", headers: staticAssetHeaders },
      { source: "/music/:path*", headers: staticAssetHeaders },
      { source: "/noise.svg", headers: staticAssetHeaders },
      { source: "/intro-loader-v2.mp4", headers: staticAssetHeaders },
      { source: "/ayanakoji-profile-320.webp", headers: staticAssetHeaders },
    ];
  },
};

export default nextConfig;
