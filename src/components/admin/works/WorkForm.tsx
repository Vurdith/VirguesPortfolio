"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";

import type { Work } from "@/types/portfolio";
import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";
import { workPieces } from "@/lib/work";

import { PiecesManager } from "./PiecesManager";
import { draftFromMedia, looksLikeSource, mediaFromDraft, type PieceDraft } from "./pieces";

type Mode = "create" | "edit";

type FormState = {
  title: string;
  slug: string;
  year: string;
  tags: string;
  summary: string;
  client: string;
  role: string;
  problem: string;
  solution: string;
  result: string;
  link: string;
  published: boolean;
};

type FieldName = Exclude<keyof FormState, "published">;

const FIELD_ORDER: FieldName[] = [
  "title",
  "slug",
  "year",
  "tags",
  "summary",
  "client",
  "role",
  "link",
  "problem",
  "solution",
  "result",
];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fromWork(work?: Work): FormState {
  return {
    title: work?.title ?? "",
    slug: work?.slug ?? "",
    year: work?.year ? String(work.year) : "",
    tags: work?.tags?.join(", ") ?? "",
    summary: work?.summary ?? "",
    client: work?.client ?? "",
    role: work?.role ?? "",
    problem: work?.problem ?? "",
    solution: work?.solution ?? "",
    result: work?.result ?? "",
    link: work?.link ?? "",
    published: work?.published ?? false,
  };
}

function piecesFromWork(work?: Work): PieceDraft[] {
  if (!work) return [];
  return workPieces(work)
    .filter((piece) => piece.src)
    .map(draftFromMedia);
}

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

function buildPayload(state: FormState, pieces: PieceDraft[]) {
  const medias = pieces.map(mediaFromDraft);
  return {
    title: state.title.trim(),
    slug: state.slug.trim(),
    year: state.year.trim() ? Number(state.year.trim()) : undefined,
    tags: parseTags(state.tags),
    // Empty strings (not undefined) so a cleared field is actually cleared on save.
    summary: state.summary.trim(),
    client: state.client.trim(),
    role: state.role.trim(),
    problem: state.problem.trim(),
    solution: state.solution.trim(),
    result: state.result.trim(),
    link: state.link.trim(),
    published: state.published,
    media: medias[0] ?? { kind: "image" as const, srcType: "upload" as const, src: "" },
    // Empty clears a collection that was reduced to a single piece.
    items: medias.length > 1 ? medias : [],
  };
}

type Issues = {
  fields: Partial<Record<FieldName, string>>;
  pieces: Record<string, string>;
  /** Not tied to one field, e.g. publishing without any piece. */
  general: string | null;
};

function validate(state: FormState, pieces: PieceDraft[]): Issues {
  const fields: Issues["fields"] = {};

  if (!state.title.trim()) fields.title = "A title is required.";
  else if (state.title.trim().length > 80) fields.title = "Keep the title under 80 characters.";

  if (!state.slug.trim()) fields.slug = "A slug is required.";
  else if (!SLUG_PATTERN.test(state.slug.trim()))
    fields.slug = "Use lowercase letters, numbers and single hyphens.";

  if (state.year.trim()) {
    const year = Number(state.year.trim());
    if (!Number.isInteger(year) || year < 1970 || year > 2100)
      fields.year = "Enter a year between 1970 and 2100.";
  }

  const tags = parseTags(state.tags);
  if (tags.length > 12) fields.tags = "Up to 12 tags.";
  else if (tags.some((tag) => tag.length > 24)) fields.tags = "Each tag can be up to 24 characters.";

  const limits: [FieldName, number][] = [
    ["summary", 420],
    ["client", 80],
    ["role", 80],
    ["problem", 900],
    ["solution", 900],
    ["result", 900],
  ];
  for (const [name, max] of limits) {
    if (state[name].trim().length > max) fields[name] = `Keep this under ${max} characters.`;
  }

  if (state.link.trim()) {
    try {
      const url = new URL(state.link.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
    } catch {
      fields.link = "Enter a full link, e.g. https://example.com.";
    }
  }

  const byPiece: Record<string, string> = {};
  let general: string | null = null;
  pieces.forEach((piece) => {
    if (piece.status === "error") byPiece[piece.key] = "This upload failed. Retry it or remove the piece.";
    else if (piece.status === "ready" && !piece.src.trim() && (pieces.length > 1 || state.published)) {
      byPiece[piece.key] = "Add a file or a URL, or remove this piece.";
    } else if (piece.srcType === "url" && piece.src.trim() && !looksLikeSource(piece.src)) {
      byPiece[piece.key] = "Enter a full https:// link or a path starting with /.";
    }
  });
  if (state.published && pieces.length === 0) general = "Add at least one piece before publishing.";
  else if (Object.keys(byPiece).length) {
    const first = pieces.findIndex((piece) => byPiece[piece.key]);
    general = `Piece ${first + 1}: ${byPiece[pieces[first].key]}`;
  }

  return { fields, pieces: byPiece, general };
}

const INPUT =
  "w-full border bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40 transition-colors duration-200 hover:border-line/25 focus:border-line/40";

const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const reveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export function WorkForm({ mode, work }: { mode: Mode; work?: Work }) {
  const router = useRouter();

  const [state, setState] = React.useState<FormState>(() => fromWork(work));
  const [pieces, setPieces] = React.useState<PieceDraft[]>(() => piecesFromWork(work));
  const [slugTouched, setSlugTouched] = React.useState(mode === "edit");
  const [touched, setTouched] = React.useState<Set<string>>(() => new Set());
  const [submitted, setSubmitted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slugConflict, setSlugConflict] = React.useState<string | null>(null);

  const saved = React.useRef(false);
  const [baseline] = React.useState(() => JSON.stringify(buildPayload(fromWork(work), piecesFromWork(work))));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
    if (key === "slug") setSlugConflict(null);
  };

  const onTitleChange = (value: string) => {
    set("title", value);
    if (!slugTouched) set("slug", slugify(value));
  };

  const touch = (name: string) =>
    setTouched((current) => (current.has(name) ? current : new Set(current).add(name)));

  const issues = React.useMemo(() => validate(state, pieces), [state, pieces]);
  const uploading = pieces.filter((piece) => piece.status === "uploading").length;
  const showIssue = (name: FieldName) => (submitted || touched.has(name) ? issues.fields[name] : undefined);
  const visiblePieceErrors = submitted ? issues.pieces : {};
  const issueCount = Object.keys(issues.fields).length + (issues.general ? 1 : 0);

  const serialized = JSON.stringify(buildPayload(state, pieces));
  const dirty = baseline !== serialized;

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (saved.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    setError(null);

    if (uploading) {
      setError(`Wait for ${uploading} upload${uploading === 1 ? "" : "s"} to finish.`);
      return;
    }

    const firstField = FIELD_ORDER.find((name) => issues.fields[name]);
    if (firstField || issues.general) {
      if (firstField) document.getElementById(`wf-${firstField}`)?.focus();
      else document.getElementById("wf-pieces")?.scrollIntoView({ block: "center" });
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "create" ? "/api/admin/works" : `/api/admin/works/${work?.id}`;
      const res = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload(state, pieces)),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 409) {
          setSlugConflict(json?.error ?? "That slug is already in use.");
          document.getElementById("wf-slug")?.focus();
          return;
        }
        throw new Error(json?.error ?? "Save failed.");
      }

      saved.current = true;
      router.push("/admin/works");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitRef = React.useRef(submit);
  React.useEffect(() => {
    submitRef.current = submit;
  });
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void submitRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const field = (name: FieldName) => ({
    id: `wf-${name}`,
    value: state[name],
    error: name === "slug" ? (slugConflict ?? showIssue(name)) : showIssue(name),
    onBlur: () => touch(name),
  });

  const status = busy
    ? "SAVING…"
    : error
      ? error
      : uploading
        ? `UPLOADING ${uploading} FILE${uploading === 1 ? "" : "S"}…`
        : submitted && issueCount
          ? `${issueCount} ISSUE${issueCount === 1 ? "" : "S"} TO FIX`
          : dirty
            ? "UNSAVED CHANGES"
            : mode === "edit"
              ? "NO CHANGES"
              : "NEW WORK";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="mx-auto max-w-7xl px-5 pt-8 md:px-8 md:pt-10"
    >
      <motion.div variants={page} initial="hidden" animate="show">
        <motion.div
          variants={reveal}
          className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <Link
              href="/admin/works"
              className="text-[11px] tracking-[0.22em] text-fog/70 transition-colors duration-200 hover:text-ink"
            >
              ← WORKS
            </Link>
            <p className="mt-5 text-xs tracking-[0.22em] text-fog/70">
              {mode === "create" ? "NEW WORK" : "EDIT WORK"}
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
              {mode === "create" ? "Compose." : "Refine."}
            </h1>
          </div>
          {mode === "edit" && work?.published ? (
            <Link
              href={`/work/${work.slug}`}
              target="_blank"
              className="inline-flex items-center rounded-full border border-line/10 bg-void/35 px-3 py-2 text-[11px] tracking-[0.22em] text-fog/70 transition-colors duration-200 hover:border-line/30 hover:text-ink"
            >
              VIEW LIVE ↗
            </Link>
          ) : null}
        </motion.div>

        <Section step="01" title="BASICS" hint="What the work is called and how it is found.">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              {...field("title")}
              label="TITLE"
              placeholder="Work title"
              maxLength={80}
              onChange={onTitleChange}
            />
            <TextField
              {...field("slug")}
              label="SLUG"
              placeholder="kebab-case"
              hint="The address of the work page: /work/your-slug."
              onChange={(value) => {
                setSlugTouched(true);
                set("slug", value);
              }}
            />
            <TextField
              {...field("year")}
              label="YEAR (OPTIONAL)"
              placeholder="2025"
              inputMode="numeric"
              onChange={(value) => set("year", value)}
            />
            <TextField
              {...field("tags")}
              label="TAGS (COMMA SEPARATED)"
              placeholder="UI, Motion, Systems"
              hint={`${parseTags(state.tags).length} / 12`}
              onChange={(value) => set("tags", value)}
            />
          </div>
          <div className="mt-4">
            <TextField
              {...field("summary")}
              label="SUMMARY (OPTIONAL)"
              placeholder="Short description (kept tight)."
              multiline
              rows={3}
              maxLength={420}
              onChange={(value) => set("summary", value)}
            />
          </div>
        </Section>

        <Section
          id="wf-pieces"
          step="02"
          title="PIECES"
          hint="Add one piece, or several to make a collection. The first piece is the cover; drag tiles or use the arrows to reorder."
        >
          <PiecesManager pieces={pieces} setPieces={setPieces} errors={visiblePieceErrors} />
          {submitted && issues.general && !Object.keys(issues.pieces).length ? (
            <p role="alert" className="mt-4 text-xs text-red-300/90">
              {issues.general}
            </p>
          ) : null}
        </Section>

        <Section
          step="03"
          title="CASE STUDY (OPTIONAL)"
          hint="Shown under the work. Fill in only what helps: the story is what turns a screenshot into proof."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <TextField
              {...field("client")}
              label="CLIENT"
              placeholder="Studio or game"
              onChange={(v) => set("client", v)}
            />
            <TextField
              {...field("role")}
              label="YOUR ROLE"
              placeholder="UI design and implementation"
              onChange={(v) => set("role", v)}
            />
            <TextField
              {...field("link")}
              label="LIVE LINK"
              placeholder="https://…"
              onChange={(v) => set("link", v)}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <TextField
              {...field("problem")}
              label="THE PROBLEM"
              placeholder="What was broken or missing?"
              multiline
              rows={6}
              maxLength={900}
              onChange={(v) => set("problem", v)}
            />
            <TextField
              {...field("solution")}
              label="WHAT I DID"
              placeholder="The approach and the decisions."
              multiline
              rows={6}
              maxLength={900}
              onChange={(v) => set("solution", v)}
            />
            <TextField
              {...field("result")}
              label="THE RESULT"
              placeholder="What changed, ideally with a number."
              multiline
              rows={6}
              maxLength={900}
              onChange={(v) => set("result", v)}
            />
          </div>
        </Section>
      </motion.div>

      <div className="sticky bottom-0 z-30 -mx-5 mt-10 border-t border-line/15 bg-void/95 px-5 py-3 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            role={error ? "alert" : "status"}
            className={cn(
              "min-w-0 flex-1 text-[11px] tracking-[0.22em]",
              error ? "text-red-300/90" : dirty ? "text-ink" : "text-fog/60",
            )}
          >
            {status}
          </p>

          <button
            type="button"
            role="switch"
            aria-checked={state.published}
            onClick={() => set("published", !state.published)}
            className="inline-flex items-center gap-3 rounded-full border border-line/10 bg-void/40 px-3 py-2.5 text-[11px] tracking-[0.22em] text-fog/80 transition-colors duration-200 hover:border-line/30"
          >
            <span
              aria-hidden="true"
              className={cn(
                "relative h-4 w-8 border transition-colors duration-200",
                state.published ? "border-line/60 bg-white/20" : "border-line/20 bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-2.5 bg-ink transition-[left] duration-200",
                  state.published ? "left-[18px]" : "left-0.5 opacity-60",
                )}
              />
            </span>
            {state.published ? "PUBLISHED" : "DRAFT"}
          </button>

          <Link
            href="/admin/works"
            className="inline-flex items-center rounded-full border border-line/10 px-4 py-2.5 text-[11px] tracking-[0.22em] text-fog/70 transition-colors duration-200 hover:border-line/30 hover:text-ink"
          >
            CANCEL
          </Link>
          <button
            type="submit"
            disabled={busy || uploading > 0}
            className="inline-flex items-center gap-3 rounded-full border border-line/40 bg-white/[0.07] px-5 py-2.5 text-xs tracking-[0.22em] text-ink transition-[border-color,background-color,transform,opacity] duration-200 hover:-translate-y-px hover:border-line/60 hover:bg-white/[0.12] active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span>{busy ? "SAVING" : "SAVE"}</span>
            <span aria-hidden="true" className="hidden text-[10px] text-fog/60 md:inline">
              CTRL S
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({
  id,
  step,
  title,
  hint,
  children,
}: {
  id?: string;
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      variants={reveal}
      aria-label={title}
      className="relative mt-8 scroll-mt-24 rounded-2xl border border-line/10 bg-void/25 p-5 md:p-6"
    >
      <CornerMarks />
      <div className="flex items-baseline gap-3 text-xs tracking-[0.22em]">
        <span className="text-fog/50">{step} /</span>
        <h2 className="text-ink">{title}</h2>
      </div>
      {hint ? <p className="mt-2 max-w-2xl text-xs leading-relaxed text-fog/70">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  multiline,
  rows,
  maxLength,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  inputMode?: "numeric";
}) {
  const messageId = `${id}-message`;
  const className = cn(INPUT, error ? "border-red-300/50" : "border-line/10", multiline && "resize-none");
  const shared = {
    id,
    value,
    placeholder,
    onBlur,
    className,
    "aria-invalid": Boolean(error),
    "aria-describedby": error || hint ? messageId : undefined,
  } as const;

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between text-[11px] tracking-[0.22em] text-fog/70"
      >
        <span>{label}</span>
        {multiline && maxLength ? (
          <span className={cn("text-fog/50", value.length > maxLength && "text-red-300/90")}>
            {value.length}/{maxLength}
          </span>
        ) : null}
      </label>
      <div className="mt-2">
        {multiline ? (
          <textarea {...shared} rows={rows} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <input {...shared} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
        )}
      </div>
      {error || hint ? (
        <p id={messageId} className={cn("mt-1.5 text-xs", error ? "text-red-300/90" : "text-fog/55")}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
