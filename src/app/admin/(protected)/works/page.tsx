import Link from "next/link";

import { WorkDeleteButton } from "@/components/admin/works/WorkDeleteButton";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminWorksPage() {
  const db = await readDb();
  const works = db.works;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-12">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.22em] text-fog/70">WORKS</p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
            Catalog.
          </h1>
        </div>

        <Link
          href="/admin/works/new"
          className="inline-flex items-center gap-3 border border-line/18 bg-void/30 px-5 py-3 text-xs tracking-[0.22em] text-ink hover:border-line/35"
        >
          <span>NEW WORK</span>
          <span className="h-px w-10 bg-line/15" />
          <span className="text-fog/70">+</span>
        </Link>
      </div>

      <div className="mt-10 overflow-hidden border border-line/12 bg-void/20 backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-3 border-b border-line/10 px-5 py-3 text-[10px] tracking-[0.22em] text-fog/70">
          <div className="col-span-1">PREVIEW</div>
          <div className="col-span-4">TITLE</div>
          <div className="col-span-3">SLUG</div>
          <div className="col-span-2">STATE</div>
          <div className="col-span-2 text-right">ACTIONS</div>
        </div>

        {works.length ? (
          <div className="divide-y divide-line/10">
            {works.map((w) => (
              <div key={w.id} className="grid grid-cols-12 items-center gap-3 px-5 py-4">
                <div className="col-span-1">
                  {w.media.src ? (
                    <div className="relative aspect-square w-10 overflow-hidden border border-line/10 bg-void/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={w.media.src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 border border-line/10 bg-void/40" />
                  )}
                </div>

                <div className="col-span-4">
                  <div className="font-serif text-lg leading-none tracking-[-0.03em]">{w.title}</div>
                  <div className="mt-2 text-[10px] tracking-[0.22em] text-fog/60">
                    UPDATED {new Date(w.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="col-span-3 text-xs text-fog/80">{w.slug}</div>

                <div className="col-span-2">
                  <span className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[10px] tracking-[0.22em] text-fog/70">
                    {w.published ? "PUBLISHED" : "DRAFT"}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/works/${w.id}/edit`}
                    className="inline-flex items-center border border-line/12 bg-void/35 px-3 py-2 text-[10px] tracking-[0.22em] text-fog/70 hover:border-line/25 hover:text-ink"
                  >
                    EDIT
                  </Link>
                  <Link
                    href={`/work/${w.slug}`}
                    className="inline-flex items-center border border-line/12 bg-void/35 px-3 py-2 text-[10px] tracking-[0.22em] text-fog/70 hover:border-line/25 hover:text-ink"
                  >
                    OPEN
                  </Link>
                  <WorkDeleteButton id={w.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-sm text-fog/70">
            No works yet. Create one — then publish to show it publicly.
          </div>
        )}
      </div>
    </div>
  );
}


