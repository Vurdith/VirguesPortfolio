"use client";

import { usePathname } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";
import { LoadingScene } from "@/components/LoadingScene";
import { SoundToggle } from "@/components/SoundToggle";

export function ClientChrome() {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/work/")) return null;

  return (
    <>
      <LoadingScene />
      <FloatingHeader />
      <div className="fixed bottom-5 right-5 z-50">
        <SoundToggle />
      </div>
    </>
  );
}


