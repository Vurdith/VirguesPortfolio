import { readLocalChatImage } from "@/lib/chat/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves locally stored reference images. With R2 configured, images come from the bucket instead. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const bytes = await readLocalChatImage(id);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
