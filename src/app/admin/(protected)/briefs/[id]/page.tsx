import { notFound } from "next/navigation";

import { BriefsInbox } from "@/components/admin/briefs/BriefsInbox";
import { adminBrief } from "@/lib/chat/admin";
import { listThreads } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

export default async function AdminBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const threads = await listThreads();
  if (!threads.some((thread) => thread.id === id)) notFound();
  return <BriefsInbox initialBriefs={threads.map(adminBrief)} initialId={id} />;
}
