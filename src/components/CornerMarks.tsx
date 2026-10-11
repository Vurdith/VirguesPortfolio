import { cn } from "@/lib/cn";

const SIZES = {
  2: "size-2",
  3: "size-3",
  4: "size-4",
} as const;

/**
 * Four L-shaped corner brackets for the framed "technical" look. Renders into the nearest
 * positioned ancestor and never intercepts the pointer.
 */
export function CornerMarks({
  size = 3,
  tone = "border-line/30",
  className,
}: {
  size?: keyof typeof SIZES;
  /** Border colour class applied to every bracket. */
  tone?: string;
  className?: string;
}) {
  const bracket = cn("absolute", SIZES[size], tone);

  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(bracket, "left-0 top-0 border-l border-t")} />
      <span className={cn(bracket, "right-0 top-0 border-r border-t")} />
      <span className={cn(bracket, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(bracket, "bottom-0 right-0 border-b border-r")} />
    </span>
  );
}
