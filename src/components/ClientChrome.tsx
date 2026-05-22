"use client";

import { usePathname } from "next/navigation";

import { FloatingHeader } from "@/components/FloatingHeader";
import { LoadingScene } from "@/components/LoadingScene";
import { ParticleField } from "@/components/ParticleField";
import { SignalCathedral } from "@/components/SignalCathedral";
import { SoundToggle } from "@/components/SoundToggle";

export function ClientChrome() {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/work/")) return null;

  return (
    <>
      {pathname === "/" ? <LoadingScene /> : null}
      <SignalCathedral />
      <ParticleField />
      <FloatingHeader />
      <div className="fixed bottom-5 right-5 z-50">
        <SoundToggle />
      </div>
    </>
  );
}


