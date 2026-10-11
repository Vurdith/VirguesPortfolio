const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.replace(/\/$/, "");

/**
 * Routes an uploaded image through Next's optimizer so cards download a right-sized WebP instead
 * of the multi-megapixel original. Anything the optimizer isn't configured for is left alone.
 */
export function optimizedImage(src: string, width = 1080, quality = 75) {
  const local = src.startsWith("/") && !src.startsWith("//");
  const hosted = Boolean(R2_BASE) && src.startsWith(`${R2_BASE}/`);
  if (!local && !hosted) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
