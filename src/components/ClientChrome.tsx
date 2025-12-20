"use client";

import { usePathname } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";

export function ClientChrome() {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/work/")) return null;

  return <FloatingHeader />;
}


