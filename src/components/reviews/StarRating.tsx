"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

export const RATING_WORDS = ["Poor", "Fair", "Good", "Great", "Excellent"] as const;

/**
 * Radio group of five stars. Arrow keys move and select, hovering previews the value, and the
 * chosen word is announced beside it.
 */
export function StarRating({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [hover, setHover] = React.useState(0);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover || value;

  const select = (next: number) => {
    const clamped = Math.min(5, Math.max(1, next));
    onChange(clamped);
    refs.current[clamped - 1]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const from = value || 0;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") select(from + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") select(from - 1);
    else if (event.key === "Home") select(1);
    else if (event.key === "End") select(5);
    else return;
    event.preventDefault();
  };

  return (
    <div className="flex items-center gap-4">
      <div
        role="radiogroup"
        aria-label="Rating"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        data-field="rating"
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
        onKeyDown={onKeyDown}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} star${n === 1 ? "" : "s"}, ${RATING_WORDS[n - 1]}`}
            tabIndex={n === (value || 1) ? 0 : -1}
            data-sound="off"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="group grid size-10 place-items-center transition-transform duration-150 hover:scale-110 active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className={cn(
                "size-6 transition-[fill,stroke,opacity] duration-150",
                n <= shown ? "fill-ink stroke-ink" : "fill-transparent stroke-fog/45 group-hover:stroke-fog",
              )}
              strokeWidth="1.4"
              strokeLinejoin="miter"
              aria-hidden="true"
            >
              <path d="M12 2.8l2.8 6.1 6.6.7-4.9 4.5 1.4 6.5L12 17.2 6.1 20.6l1.4-6.5L2.6 9.6l6.6-.7L12 2.8z" />
            </svg>
          </button>
        ))}
      </div>
      <span aria-hidden="true" className="min-w-[5.5rem] text-[11px] tracking-[0.22em] text-fog/80">
        {shown ? RATING_WORDS[shown - 1].toUpperCase() : "TAP TO RATE"}
      </span>
      <span className="sr-only" aria-live="polite">
        {value ? `${value} of 5, ${RATING_WORDS[value - 1]}` : ""}
      </span>
    </div>
  );
}
