"use client";

import { LayoutGroup, motion } from "framer-motion";
import { useId } from "react";

import { cn } from "@/lib/cn";

/** Filter pills with a highlight that slides between them. Empty filters (other than the current one) fold away. */
export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: T; label: string; count: number }[];
  value: T;
  onChange: (key: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.key)}
              className={cn("relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm transition-colors", active ? "text-ink" : "text-fog/65 hover:text-ink")}
            >
              {active ? (
                <motion.span layoutId="tab-pill" aria-hidden="true" className="absolute inset-0 rounded-full border border-line/15 bg-white/[0.08]" transition={{ type: "spring", stiffness: 520, damping: 38 }} />
              ) : null}
              <span className="relative">{item.label}</span>
              <span className={cn("relative tabular-nums", active ? "text-fog/70" : "text-fog/45")}>{item.count}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
