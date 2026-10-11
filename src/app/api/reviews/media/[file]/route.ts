import { readLocalReviewImage } from "@/lib/reviewStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves locally stored review images (used when Cloudflare R2 is not configured). */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const data = await readLocalReviewImage(file);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "image/webp",
      "content-length": String(data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
