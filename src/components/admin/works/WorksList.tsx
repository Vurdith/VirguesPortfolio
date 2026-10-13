"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import type { Work } from "@/types/portfolio";
import { WorkDeleteButton } from "@/components/admin/works/WorkDeleteButton";
import { cn } from "@/lib/cn";
import { focusPosition } from "@/lib/focus";
import { optimizedImage } from "@/lib/images";
import { workPieces } from "@/lib/work";

const SMALL_BUTTON =
  "inline-flex items-center rounded-full border border-line/10 bg-void/35 px-3 py-2 text-[11px] tracking-[0.22em] text-fog/70 transition-colors duration-200 hover:border-line/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

type Filter = "all" | "published" | "draft";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "published", label: "PUBLISHED" },
  { id: "draft", label: "DRAFT" },
];

/**
 * Catalog with manual ordering. Rows can be dragged or moved with the arrow buttons (which also
 * work from the keyboard); the new order is saved as soon as it changes. Ordering only applies to
 * the full list, so it is switched off while filtering.
 */
export function WorksList({ initialWorks }: { initialWorks: Work[] }) {
  const router = useRouter();
  const [works, setWorks] = React.useState(initialWorks);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => setWorks(initialWorks), [initialWorks]);

  const counts = {
    all: works.length,
    published: works.filter((work) => work.published).length,
    draft: works.filter((work) => !work.published).length,
  };

  const needle = query.trim().toLowerCase();
  const visible = works.filter(
    (work) =>
      (filter === "all" || (filter === "published") === work.published) &&
      (!needle || work.title.toLowerCase().includes(needle) || work.slug.includes(needle)),
  );
  const canReorder = filter === "all" && !needle;

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
    if (!canReorder || from === to || to < 0 || to >= works.length) return;
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

  const togglePublished = async (work: Work) => {
    const previous = works;
    setError(null);
    setWorks(works.map((item) => (item.id === work.id ? { ...item, published: !work.published } : item)));
    try {
      const res = await fetch(`/api/admin/works/${work.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: !work.published }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? "Could not update the work.");
      }
      router.refresh();
    } catch (err) {
      setWorks(previous);
      setError(err instanceof Error ? err.message : "Could not update the work.");
    }
  };

  if (!works.length) {
    return (
      <div className="flex flex-col items-start gap-4 px-5 py-10 text-sm text-fog/70">
        <p>No works yet. Create one, then publish to show it publicly.</p>
        <Link href="/admin/works/new" className={SMALL_BUTTON}>
          + NEW WORK
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line/10 px-5 py-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filter works" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "inline-flex items-center gap-2 border px-3 py-1.5 text-[11px] tracking-[0.22em] transition-colors duration-200",
                filter === item.id
                  ? "border-line/35 bg-white/[0.05] text-ink"
                  : "border-line/10 text-fog/70 hover:border-line/25 hover:text-ink",
              )}
            >
              {item.label}
              <span className="text-fog/50">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search works"
          placeholder="Search title or slug"
          className="w-full rounded-xl border border-line/10 bg-void/35 px-3 py-2 text-xs tracking-[0.1em] text-ink placeholder:text-fog/40 transition-colors duration-200 hover:border-line/25 focus:border-line/40 md:w-64"
        />
      </div>

      <div className="hidden grid-cols-12 gap-3 border-b border-line/10 px-5 py-3 text-[11px] tracking-[0.22em] text-fog/70 md:grid">
        <div className="col-span-2">{canReorder ? "ORDER / PREVIEW" : "PREVIEW"}</div>
        <div className="col-span-3">TITLE</div>
        <div className="col-span-2">SLUG</div>
        <div className="col-span-2">STATE</div>
        <div className="col-span-3 text-right">ACTIONS</div>
      </div>

      {visible.length ? (
        <ul className="divide-y divide-line/10">
          {visible.map((work, index) => {
            const pieces = workPieces(work);
            const cover = pieces[0];
            const thumb = cover.kind === "video" ? cover.poster || "" : cover.src;
            const position = works.findIndex((item) => item.id === work.id);
            return (
              <motion.li
                key={work.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: dragId === work.id ? 0.4 : 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.03, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  draggable={canReorder}
                  onDragStart={() => canReorder && setDragId(work.id)}
                  onDragOver={(event) => {
                    if (!dragId) return;
                    event.preventDefault();
                    setOverId(work.id);
                  }}
                  onDrop={() => onDrop(work.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-4 transition-colors duration-200 hover:bg-white/[0.025] md:grid-cols-12 md:items-center md:gap-3 md:px-5",
                    overId === work.id && dragId !== work.id && "bg-white/[0.05]",
                  )}
                >
                  <div className="row-span-3 flex items-start gap-2 md:col-span-2 md:row-span-1 md:items-center md:gap-3">
                    {canReorder ? (
                      <>
                        <span aria-hidden="true" className="hidden cursor-grab select-none text-fog/40 md:inline">
                          ⋮⋮
                        </span>
                        <div className="flex flex-col gap-1 max-md:order-last max-md:gap-0 max-md:self-center [&>button]:max-md:grid [&>button]:max-md:size-8 [&>button]:max-md:place-items-center">
                          <button
                            type="button"
                            aria-label={`Move ${work.title} up`}
                            disabled={position === 0 || saving}
                            onClick={() => move(position, position - 1)}
                            className="px-1 text-[11px] leading-none text-fog/70 hover:text-ink disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${work.title} down`}
                            disabled={position === works.length - 1 || saving}
                            onClick={() => move(position, position + 1)}
                            className="px-1 text-[11px] leading-none text-fog/70 hover:text-ink disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </>
                    ) : null}
                    <div className="relative size-14 shrink-0 md:size-10">
                      {pieces.length > 1 ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-1 -top-1 h-full rounded-lg border border-line/15 bg-void/60"
                        />
                      ) : null}
                      <div className="relative size-full overflow-hidden rounded-2xl border border-line/10 bg-void/40">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={optimizedImage(thumb, 128)}
                            alt=""
                            draggable={false}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            style={{ objectPosition: focusPosition(cover) }}
                          />
                        ) : null}
                      </div>
                      {pieces.length > 1 ? (
                        <span className="absolute -bottom-1.5 -right-1.5 rounded-md border border-line/25 bg-void px-1 text-[10px] leading-4 tracking-[0.1em] text-ink">
                          {pieces.length}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="font-serif text-lg leading-none tracking-[-0.03em]">{work.title}</div>
                    <div className="mt-2 text-[11px] tracking-[0.22em] text-fog/70">
                      {pieces.length > 1 ? `${pieces.length} PIECES · ` : ""}UPDATED{" "}
                      {new Date(work.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="break-all text-xs text-fog/80 max-md:col-start-2 md:col-span-2">/{work.slug}</div>

                  <div className="max-md:col-start-2 md:col-span-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={work.published}
                      aria-label={`${work.title}: ${work.published ? "published" : "draft"}. Toggle.`}
                      onClick={() => void togglePublished(work)}
                      className={cn(
                        "inline-flex items-center gap-2 border px-2 py-1 text-[11px] tracking-[0.22em] transition-colors duration-200",
                        work.published
                          ? "border-line/30 bg-white/[0.05] text-ink hover:border-line/50"
                          : "border-line/10 bg-void/35 text-fog/70 hover:border-line/30",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn("size-1.5 rounded-full", work.published ? "bg-ink" : "bg-fog/40")}
                      />
                      {work.published ? "PUBLISHED" : "DRAFT"}
                    </button>
                  </div>

                  <div className="col-span-2 flex items-center gap-2 max-md:mt-1 md:col-span-3 md:justify-end">
                    <Link href={`/admin/works/${work.id}/edit`} className={SMALL_BUTTON}>
                      EDIT
                    </Link>
                    <Link href={`/work/${work.slug}`} className={SMALL_BUTTON}>
                      OPEN
                    </Link>
                    <WorkDeleteButton id={work.id} />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-10 text-sm text-fog/70">No works match.</p>
      )}
      {!canReorder ? (
        <p className="border-t border-line/10 px-5 py-3 text-[11px] tracking-[0.22em] text-fog/50">
          CLEAR THE FILTER AND SEARCH TO REORDER
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="border-t border-line/10 px-5 py-4 text-sm text-red-300/90">
          {error}
        </div>
      ) : null}
    </>
  );
}
