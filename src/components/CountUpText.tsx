"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

const NUMBER = /\d[\d,]*(?:\.\d+)?/;

/**
 * Renders `text` and counts its first number up from zero the first time it scrolls into view
 * (e.g. "From £1650 / yr"). Text without a number is rendered as-is.
 */
export function CountUpText({ text, className }: { text: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduceMotion = useReducedMotion();

  const match = NUMBER.exec(text);
  const target = match ? Number(match[0].replace(/,/g, "")) : null;
  const grouped = Boolean(match?.[0].includes(","));
  const decimals = match?.[0].split(".")[1]?.length ?? 0;
  const [value, setValue] = React.useState(target);

  // Start from zero on the client; the server renders the real number for no-JS and search.
  React.useLayoutEffect(() => {
    if (target !== null && !reduceMotion) setValue(0);
  }, [target, reduceMotion]);

  React.useEffect(() => {
    if (!inView || target === null || reduceMotion) return;
    const controls = animate(0, target, {
      duration: 1.3,
      ease: [0.2, 0.85, 0.2, 1],
      onUpdate: (latest) => setValue(Number(latest.toFixed(decimals))),
    });
    return () => controls.stop();
  }, [inView, target, decimals, reduceMotion]);

  if (!match || value === null) return <span className={className}>{text}</span>;

  return (
    <span ref={ref} className={className}>
      {text.slice(0, match.index)}
      <span className="tabular-nums">{grouped ? value.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : value.toFixed(decimals)}</span>
      {text.slice(match.index + match[0].length)}
    </span>
  );
}
