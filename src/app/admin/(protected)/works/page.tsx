import Link from "next/link";

import { WorksList } from "@/components/admin/works/WorksList";
import { readDb, sortWorks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminWorksPage() {
  const db = await readDb();
  const works = sortWorks(db.works);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.22em] text-fog/70">WORKS</p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">Catalog.</h1>
        </div>

        <Link
          href="/admin/works/new"
          className="inline-flex items-center gap-3 border border-line/18 bg-void/30 px-5 py-3 text-xs tracking-[0.22em] text-ink transition-[border-color,transform] duration-300 hover:-translate-y-px hover:border-line/35 active:translate-y-0"
        >
          <span>NEW WORK</span>
          <span className="h-px w-10 bg-line/15" />
          <span className="text-fog/70">+</span>
        </Link>
      </div>

      <div className="mt-10 overflow-hidden border border-line/12 bg-void/25">
        <WorksList initialWorks={works} />
      </div>
    </div>
  );
}
