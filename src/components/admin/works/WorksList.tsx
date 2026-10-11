"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Work } from "@/types/portfolio";
import { WorkDeleteButton } from "@/components/admin/works/WorkDeleteButton";
import { cn } from "@/lib/cn";
import { focusPosition } from "@/lib/focus";

const SMALL_BUTTON =
  "inline-flex items-center border border-line/12 bg-void/35 px-3 py-2 text-[10px] tracking-[0.22em] text-fog/70 transition-colors duration-300 hover:border-line/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Catalog with manual ordering. Rows can be dragged or moved with the arrow buttons (which also
 * work from the keyboard); the new order is saved as soon as it changes.
 */
export function WorksList({ initialWorks }: { initialWorks: Work[] }) {
  const router = useRouter();
  const [works, setWorks] = React.useState(initialWorks);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setWorks(initialWorks), [initialWorks]);

  const save = async (next: Work[], previous: Work[]) => {
    setWorks(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/works/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: next.map((work) => work.id) }),
      });
      if (!res.ok) throw new Error("Could not save the order.");
      router.refresh();
    } catch (err) {
      setWorks(previous);
      setError(err instanceof Error ? err.message : "Could not save the order.");
    } finally {
      setSaving(false);
    }
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= works.length) return;
    const next = [...works];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void save(next, works);
  };

  const onDrop = (targetId: string) => {
    const from = works.findIndex((work) => work.id === dragId);
    const to = works.findIndex((work) => work.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from !== -1 && to !== -1) move(from, to);
  };

  if (!works.length) {
    return (
      <div className="px-5 py-10 text-sm text-fog/70">
        No works yet. Create one, then publish to show it publicly.
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-line/10">
        {works.map((work, index) => (
          <li
            key={work.id}
            draggable
            onDragStart={() => setDragId(work.id)}
            onDragOver={(event) => {
              event.preventDefault();
              setOverId(work.id);
            }}
            onDrop={() => onDrop(work.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            className={cn(
              "grid gap-4 px-5 py-5 transition-colors duration-300 hover:bg-white/[0.025] md:grid-cols-12 md:items-center md:gap-3 md:py-4",
              dragId === work.id && "opacity-40",
              overId === work.id && dragId !== work.id && "bg-white/[0.05]",
            )}
          >
            <div className="flex items-center gap-3 md:col-span-2">
              <span aria-hidden="true" className="cursor-grab select-none text-fog/40">
                ⋮⋮
              </span>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-label={`Move ${work.title} up`}
                  disabled={index === 0 || saving}
                  onClick={() => move(index, index - 1)}
                  className="px-1 text-[10px] leading-none text-fog/60 hover:text-ink disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${work.title} down`}
                  disabled={index === works.length - 1 || saving}
                  onClick={() => move(index, index + 1)}
                  className="px-1 text-[10px] leading-none text-fog/60 hover:text-ink disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              {work.media.src ? (
                <div className="relative aspect-square w-14 overflow-hidden border border-line/10 bg-void/40 md:w-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={work.media.kind === "video" ? work.media.poster || "" : work.media.src}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: focusPosition(work.media) }}
                  />
                </div>
              ) : (
                <div className="h-10 w-10 border border-line/10 bg-void/40" />
              )}
            </div>

            <div className="md:col-span-3">
              <div className="font-serif text-lg leading-none tracking-[-0.03em]">{work.title}</div>
              <div className="mt-2 text-[10px] tracking-[0.22em] text-fog/60">
                UPDATED {new Date(work.updatedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="text-xs text-fog/80 md:col-span-3">{work.slug}</div>

            <div className="md:col-span-2">
              <span className="inline-flex items-center border border-line/12 bg-void/35 px-2 py-1 text-[10px] tracking-[0.22em] text-fog/70">
                {work.published ? "PUBLISHED" : "DRAFT"}
              </span>
            </div>

            <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
              <Link href={`/admin/works/${work.id}/edit`} className={SMALL_BUTTON}>
                EDIT
              </Link>
              <Link href={`/work/${work.slug}`} className={SMALL_BUTTON}>
                OPEN
              </Link>
              <WorkDeleteButton id={work.id} />
            </div>
          </li>
        ))}
      </ul>
      {error ? <div className="border-t border-line/10 px-5 py-4 text-sm text-fog/80">{error}</div> : null}
    </>
  );
}
