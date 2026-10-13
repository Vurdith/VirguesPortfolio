import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveChat } from "@/components/admin/briefs/LiveChat";
import { adminBrief } from "@/lib/chat/admin";
import { getThread } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

export default async function AdminBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <Link href="/admin/briefs" className="text-[11px] tracking-[0.22em] text-fog/65 transition-colors hover:text-ink">
        ← BRIEFS
      </Link>
      <div className="mt-6">
        <LiveChat initial={adminBrief(thread)} />
      </div>
    </div>
  );
}
