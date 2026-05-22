import type * as React from "react";

import { cn } from "@/lib/cn";

type IconName =
  | "card"
  | "frame"
  | "mail"
  | "process"
  | "review"
  | "services"
  | "work";

const PATHS: Record<IconName, React.ReactNode> = {
  card: (
    <>
      <rect x="4" y="7" width="16" height="10" />
      <path d="M4 10h16M7 14h4" />
    </>
  ),
  frame: (
    <>
      <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" />
      <path d="M9 12h6" />
    </>
  ),
  mail: (
    <>
      <rect x="4" y="6" width="16" height="12" />
      <path d="m5 8 7 5 7-5" />
    </>
  ),
  process: (
    <>
      <path d="M5 7h6M13 7h6M5 17h6M13 17h6" />
      <path d="M12 7v10" />
      <circle cx="12" cy="7" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
    </>
  ),
  review: (
    <>
      <path d="M5 6h14v9H9l-4 3V6Z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  services: (
    <>
      <path d="M6 7h12M6 12h12M6 17h12" />
      <path d="M9 5v4M15 10v4M11 15v4" />
    </>
  ),
  work: (
    <>
      <rect x="5" y="5" width="14" height="14" />
      <path d="M8 15 11 11l2 2 3-5" />
    </>
  ),
};

export function MonoIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeWidth="1.25"
      className={cn("size-5 text-fog/70", className)}
    >
      {PATHS[name]}
    </svg>
  );
}
