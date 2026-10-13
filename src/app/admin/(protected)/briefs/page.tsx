import { BriefsTable } from "@/components/admin/briefs/BriefsTable";
import { PageHeader } from "@/components/admin/ui";
import { adminBrief } from "@/lib/chat/admin";
import { listThreads } from "@/lib/chat/store";

export const dynamic = "force-dynamic";

export default async function AdminBriefsPage() {
  const threads = await listThreads();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader eyebrow="ASSISTANT" title="Briefs." />
      <div className="mt-10">
        <BriefsTable initialBriefs={threads.map(adminBrief)} />
      </div>
    </div>
  );
}
