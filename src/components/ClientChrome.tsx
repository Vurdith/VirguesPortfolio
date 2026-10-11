"use client";

import { usePathname } from "next/navigation";

import { AnimationGate } from "@/components/AnimationGate";
import { CursorSpotlight } from "@/components/CursorSpotlight";
import { CustomCursor } from "@/components/CustomCursor";
import { FloatingHeader } from "@/components/FloatingHeader";
import { LoadingScene } from "@/components/LoadingScene";
import { ParticleField } from "@/components/ParticleField";
import { ScrollProgress } from "@/components/ScrollProgress";
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
      {pathname === "/" ? <AnimationGate /> : null}
      <ParticleField />
      <FloatingHeader />
      {pathname === "/" ? <ScrollProgress /> : null}
    </>
  );
}


