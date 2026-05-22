"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { Work } from "@/types/portfolio";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";
import { useUiSounds } from "@/hooks/useUiSounds";

type Mode = "create" | "edit";

type FormState = {
  title: string;
  slug: string;
  year: string;
  tags: string;
  summary: string;
  published: boolean;
  mediaKind: "image" | "video";
  srcType: "upload" | "url";
  src: string;
  poster: string;
};

function fromWork(work?: Work): FormState {
  return {
    title: work?.title ?? "",
    slug: work?.slug ?? "",
    year: work?.year ? String(work.year) : "",
    tags: work?.tags?.join(", ") ?? "",
    summary: work?.summary ?? "",
    published: work?.published ?? false,
    mediaKind: work?.media.kind ?? "image",
    srcType: work?.media.srcType ?? "upload",
    src: work?.media.src ?? "",
    poster: work?.media.poster ?? "",
  };
}

async function uploadFile(file: File, kind: "image" | "video" | "poster") {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", file);

  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed.");
  const json = (await res.json()) as { path?: string };
  if (!json.path) throw new Error("Upload failed.");
  return json.path;
}

export function WorkForm({
  mode,
  work,
}: {
  mode: Mode;
  work?: Work;
}) {
  const router = useRouter();
  const { playHover, playClick } = useUiSounds();

  const [state, setState] = React.useState<FormState>(() => fromWork(work));
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPoster, setPendingPoster] = React.useState<File | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const onTitleChange = (v: string) => {
    set("title", v);
    if (!slugTouched) set("slug", slugify(v));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const tags = state.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: state.title.trim(),
        slug: state.slug.trim(),
        year: state.year.trim() ? Number(state.year.trim()) : undefined,
        tags,
        summary: state.summary.trim() ? state.summary.trim() : undefined,
        published: state.published,
        media: {
          kind: state.mediaKind,
          srcType: state.srcType,
          src: state.src.trim(),
          poster: state.mediaKind === "video" && state.poster.trim() ? state.poster.trim() : undefined,
        },
      };

      const endpoint = mode === "create" ? "/api/admin/works" : `/api/admin/works/${work?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Save failed.");
      }

      router.push("/admin/works");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const uploadMain = async () => {
    if (!pendingFile) return;
    setBusy(true);
    setError(null);
    try {
      const kind = state.mediaKind === "video" ? "video" : "image";
      const path = await uploadFile(pendingFile, kind);
      set("src", path);
      setPendingFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const uploadPoster = async () => {
    if (!pendingPoster) return;
    setBusy(true);
    setError(null);
    try {
      const path = await uploadFile(pendingPoster, "poster");
      set("poster", path);
      setPendingPoster(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.22em] text-fog/70">
            {mode === "create" ? "NEW WORK" : "EDIT WORK"}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
            {mode === "create" ? "Compose." : "Refine."}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-3 border border-line/12 bg-void/30 px-4 py-3 text-[10px] tracking-[0.22em] text-fog/70">
            <input
              type="checkbox"
              checked={state.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            PUBLISHED
          </label>
          <button
            type="button"
            disabled={busy}
            onMouseEnter={playHover}
            onClick={() => {
              playClick();
              void submit();
            }}
            className={cn(
              "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-300",
              "hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span>{busy ? "SAVING" : "SAVE"}</span>
            <span className="h-px w-10 bg-line/15" />
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Field label="TITLE">
          <input
            value={state.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="Work title"
          />
        </Field>

        <Field label="SLUG">
          <input
            value={state.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            className="w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="kebab-case"
          />
        </Field>

        <Field label="YEAR (OPTIONAL)">
          <input
            value={state.year}
            onChange={(e) => set("year", e.target.value)}
            className="w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="2025"
          />
        </Field>

        <Field label="TAGS (comma separated)">
          <input
            value={state.tags}
            onChange={(e) => set("tags", e.target.value)}
            className="w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="UI, Motion, Systems"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="SUMMARY (OPTIONAL)">
          <textarea
            value={state.summary}
            onChange={(e) => set("summary", e.target.value)}
            className="h-28 w-full resize-none border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
            placeholder="Short description (kept tight)."
          />
        </Field>
      </div>

      <div className="mt-10 border border-line/12 bg-void/25 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs tracking-[0.22em] text-fog/70">MEDIA</div>
          <div className="flex flex-wrap gap-2">
            <select
              value={state.mediaKind}
              onChange={(e) => set("mediaKind", e.target.value as "image" | "video")}
              className="border border-line/12 bg-void/35 px-3 py-2 text-xs tracking-[0.22em] text-fog/80"
            >
              <option value="image">IMAGE</option>
              <option value="video">VIDEO</option>
            </select>
            <select
              value={state.srcType}
              onChange={(e) => set("srcType", e.target.value as "upload" | "url")}
              className="border border-line/12 bg-void/35 px-3 py-2 text-xs tracking-[0.22em] text-fog/80"
            >
              <option value="upload">UPLOAD</option>
              <option value="url">URL</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-[10px] tracking-[0.22em] text-fog/70">
              {state.mediaKind === "video" ? "VIDEO SOURCE" : "IMAGE SOURCE"}
            </div>

            {state.srcType === "url" ? (
              <input
                value={state.src}
                onChange={(e) => set("src", e.target.value)}
                className="mt-2 w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
                placeholder={state.mediaKind === "video" ? "https://…/video.mp4" : "https://…/image.jpg"}
              />
            ) : (
              <div className="mt-2 space-y-3">
                <input
                  type="file"
                  accept={state.mediaKind === "video" ? "video/mp4,video/webm" : "image/*"}
                  onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-fog/70 file:mr-3 file:border-0 file:bg-void/40 file:px-4 file:py-2 file:text-xs file:tracking-[0.22em] file:text-ink"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busy || !pendingFile}
                    onMouseEnter={playHover}
                    onClick={() => {
                        playClick();
                        void uploadMain();
                      }}
                    className={cn(
                      "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-4 py-2 text-xs tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-300",
                      "hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <span>{busy ? "UPLOADING" : "UPLOAD"}</span>
                    <span className="h-px w-8 bg-line/15" />
                  </button>
                  <div className="text-xs text-fog/70">{state.src ? state.src : "—"}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] tracking-[0.22em] text-fog/70">
              {state.mediaKind === "video" ? "POSTER (OPTIONAL)" : "PREVIEW"}
            </div>

            {state.mediaKind === "video" ? (
              state.srcType === "url" ? (
                <input
                  value={state.poster}
                  onChange={(e) => set("poster", e.target.value)}
                  className="mt-2 w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
                  placeholder="Poster URL (optional)"
                />
              ) : (
                <div className="mt-2 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPendingPoster(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-fog/70 file:mr-3 file:border-0 file:bg-void/40 file:px-4 file:py-2 file:text-xs file:tracking-[0.22em] file:text-ink"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busy || !pendingPoster}
                      onMouseEnter={playHover}
                      onClick={() => {
                        playClick();
                        void uploadPoster();
                      }}
                      className={cn(
                        "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-4 py-2 text-xs tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-300",
                        "hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
                      )}
                    >
                      <span>{busy ? "UPLOADING" : "UPLOAD"}</span>
                      <span className="h-px w-8 bg-line/15" />
                    </button>
                    <div className="text-xs text-fog/70">{state.poster ? state.poster : "—"}</div>
                  </div>
                </div>
              )
            ) : state.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.src}
                alt=""
                className="mt-2 h-40 w-full border border-line/12 object-cover"
              />
            ) : (
              <div className="mt-2 h-40 w-full border border-line/12 bg-void/25" />
            )}
          </div>
        </div>

        {error ? <div className="mt-6 text-sm text-fog/80">{error}</div> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.22em] text-fog/70">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}


