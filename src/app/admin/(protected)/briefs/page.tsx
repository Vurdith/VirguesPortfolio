import { BriefsInbox } from "@/components/admin/briefs/BriefsInbox";
import { adminBrief } from "@/lib/chat/admin";
import { listThreads } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

export default async function AdminBriefsPage() {
  const threads = await listThreads();
  return <BriefsInbox initialBriefs={threads.map(adminBrief)} initialId={null} />;
}
