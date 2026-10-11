"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";
import { REVIEW_ATTACHMENTS } from "@/lib/reviewLimits";

import { formatBytes, prepareImage, uploadImage } from "./reviewClient";

type Item = {
  key: string;
  name: string;
  size: number;
  preview: string;
  status: "uploading" | "done" | "error";
  progress: number;
  id?: string;
  error?: string;
};

/** State for a set of images being attached: validation, shrinking, uploading one by one, removal. */
export function useAttachments() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const controllers = React.useRef(new Map<string, AbortController>());
  const counter = React.useRef(0);
  const itemsRef = React.useRef<Item[]>([]);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = React.useCallback((key: string, change: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  }, []);

  const start = React.useCallback(
    async (key: string, file: File) => {
      const controller = new AbortController();
      controllers.current.set(key, controller);
      try {
        const uploaded = await uploadImage(file, (progress) => patch(key, { progress }), controller.signal);
        patch(key, { status: "done", progress: 1, id: uploaded.id });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        patch(key, { status: "error", error: err instanceof Error ? err.message : "Upload failed." });
      } finally {
        controllers.current.delete(key);
      }
    },
    [patch],
  );

  const add = React.useCallback(
    async (files: File[]) => {
      setNotice(null);
      const room = REVIEW_ATTACHMENTS.max - itemsRef.current.length;
      if (room <= 0) {
        setNotice(`You can attach up to ${REVIEW_ATTACHMENTS.max} images.`);
        return;
      }
      if (files.length > room) setNotice(`Only ${room} more image${room === 1 ? "" : "s"} fit. The rest were skipped.`);

      for (const original of files.slice(0, room)) {
        const prepared = await prepareImage(original);
        if ("error" in prepared) {
          setNotice(`${original.name}: ${prepared.error}`);
          continue;
        }
        const key = `${Date.now()}-${counter.current++}`;
        const item: Item = {
          key,
          name: original.name,
          size: prepared.file.size,
          preview: URL.createObjectURL(prepared.file),
          status: "uploading",
          progress: 0,
        };
        setItems((current) => [...current, item]);
        void start(key, prepared.file);
      }
    },
    [start],
  );

  const remove = React.useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    setItems((current) => {
      const gone = current.find((item) => item.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return current.filter((item) => item.key !== key);
    });
    setNotice(null);
  }, []);

  const reset = React.useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    setItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    setNotice(null);
  }, []);

  React.useEffect(() => {
    const running = controllers.current;
    return () => {
      running.forEach((controller) => controller.abort());
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, []);

  return {
    items,
    notice,
    add,
    remove,
    reset,
    uploading: items.some((item) => item.status === "uploading"),
    failed: items.some((item) => item.status === "error"),
    ids: items.flatMap((item) => (item.status === "done" && item.id ? [item.id] : [])),
  };
}

export type AttachmentsController = ReturnType<typeof useAttachments>;

/** Thumbnails with upload progress, plus an add button that also accepts drag and drop. */
export function AttachmentPicker({
  controller,
  disabled,
  className,
}: {
  controller: AttachmentsController;
  disabled?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const labelId = React.useId();
  const [dragging, setDragging] = React.useState(false);
  const { items, notice, add, remove } = controller;
  const full = items.length >= REVIEW_ATTACHMENTS.max;

  const pick = (list: FileList | null) => {
    if (list?.length) void add(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={className}
      onDragOver={(event) => {
        if (disabled || full) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) pick(event.dataTransfer.files);
      }}
    >
      <div className="flex items-baseline justify-between gap-4 text-[11px] tracking-[0.22em] text-fog/72">
        <span id={labelId}>IMAGES (OPTIONAL)</span>
        <span className="tabular-nums">
          {items.length}/{REVIEW_ATTACHMENTS.max}
        </span>
      </div>

      <ul
        aria-labelledby={labelId}
        className={cn(
          "mt-2 grid grid-cols-4 gap-2 border border-dashed p-2 transition-colors duration-200",
          dragging ? "border-ink/60 bg-white/[0.04]" : "border-line/14",
        )}
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.key}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="group relative aspect-square overflow-hidden border border-line/14 bg-void/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.preview} alt={item.name} className={cn("size-full object-cover", item.status !== "done" && "opacity-50")} />
              {item.status === "uploading" ? (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60" role="progressbar" aria-label={`Uploading ${item.name}`} aria-valuenow={Math.round(item.progress * 100)}>
                  <div className="h-full bg-ink transition-[width] duration-150" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </div>
              ) : null}
              {item.status === "error" ? (
                <div className="absolute inset-0 grid place-items-center bg-black/70 p-1.5 text-center text-[10px] leading-tight text-red-200" role="alert">
                  {item.error}
                </div>
              ) : null}
              <button
                type="button"
                data-sound="off"
                onClick={() => remove(item.key)}
                aria-label={`Remove ${item.name} (${formatBytes(item.size)})`}
                className="absolute right-1 top-1 grid size-6 place-items-center border border-line/25 bg-black/70 text-sm leading-none text-ink hover:border-ink/70"
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>

        {full ? null : (
          <li className={cn("aspect-square", !items.length && "col-span-4 aspect-auto")}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group flex size-full items-center justify-center gap-3 border border-line/12 bg-void/35 text-fog/72 transition-colors duration-200 hover:border-line/35 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
                !items.length ? "min-h-[4.25rem] flex-row px-4 text-left" : "flex-col",
              )}
            >
              <span aria-hidden="true" className="text-xl leading-none transition-transform duration-200 group-hover:rotate-90">
                +
              </span>
              <span className={cn("tracking-[0.18em]", items.length ? "sr-only" : "text-[11px]")}>
                {items.length ? "Add image" : "ADD IMAGES OR DROP THEM HERE"}
              </span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={REVIEW_ATTACHMENTS.accept}
        multiple
        hidden
        onChange={(event) => pick(event.target.files)}
      />

      <p className={cn("mt-2 text-xs", notice ? "text-red-200" : "text-fog/70")} role={notice ? "alert" : undefined}>
        {notice ?? "Up to 4 images. JPG, PNG, WebP or GIF, 5MB each. Shown after approval."}
      </p>
    </div>
  );
}
