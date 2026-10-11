import type { Rating } from "@/types/portfolio";
import { cn } from "@/lib/cn";

export function Stars({
  rating,
  glyph = "*",
  className,
}: {
  rating: Rating;
  glyph?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("text-xs", i < rating ? "text-ink/90" : "text-fog/35")}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}
