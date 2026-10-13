import Link from "next/link";

import { PageHeader, adminButtonSolid } from "@/components/admin/ui";
import { WorksList } from "@/components/admin/works/WorksList";
import { readDb, sortWorks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminWorksPage() {
  const db = await readDb();
  const works = sortWorks(db.works);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader title="Works">
        <Link href="/admin/works/new" className={adminButtonSolid}>
          + New work
        </Link>
      </PageHeader>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line/10 bg-white/[0.02]">
        <WorksList initialWorks={works} />
      </div>
    </div>
  );
}
