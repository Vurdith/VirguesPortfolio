import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

/** Small status pill: a pulsing dot when open for work, a still hollow one when booked. */
export function AvailabilityBadge({ className }: { className?: string }) {
  const { open, label } = SITE.availability;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 border border-line/14 bg-void/30 px-3 py-1.5 text-[10px] tracking-[0.22em] text-fog/80 backdrop-blur-sm",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {open ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/60 motion-reduce:hidden" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-1.5 rounded-full",
            open ? "bg-emerald-300" : "border border-fog/60",
          )}
        />
      </span>
      <span>{open ? label.toUpperCase() : "FULLY BOOKED"}</span>
    </div>
  );
}
