"use client";

import { usePathname } from "next/navigation";

import { CursorSpotlight } from "@/components/CursorSpotlight";
import { CustomCursor } from "@/components/CustomCursor";
import { FloatingHeader } from "@/components/FloatingHeader";
import { LoadingScene } from "@/components/LoadingScene";
import { MotionToggle } from "@/components/MotionToggle";
import { ParticleField } from "@/components/ParticleField";
import { ScrollProgress } from "@/components/ScrollProgress";
import { SoundToggle } from "@/components/SoundToggle";
import { TapRipple } from "@/components/TapRipple";

export function ClientChrome() {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/work/")) return <CustomCursor />;

  return (
    <>
      <CustomCursor />
      <CursorSpotlight />
      <TapRipple />
      {pathname === "/" ? <LoadingScene /> : null}
      <ParticleField />
      <FloatingHeader />
      {pathname === "/" ? <ScrollProgress /> : null}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <MotionToggle />
        <SoundToggle />
      </div>
    </>
  );
}


