"use client";

import { usePathname } from "next/navigation";

import { AnimationGate } from "@/components/AnimationGate";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { CursorSpotlight } from "@/components/CursorSpotlight";
import { CustomCursor } from "@/components/CustomCursor";
import { FloatingHeader } from "@/components/FloatingHeader";
import { LoadingScene } from "@/components/LoadingScene";
import { ParticleField } from "@/components/ParticleField";
import { ScrollProgress } from "@/components/ScrollProgress";
import { TapRipple } from "@/components/TapRipple";

export function ClientChrome({ chat = false }: { chat?: boolean }) {
  const pathname = usePathname() ?? "/";

  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/chat")) return <CustomCursor />;
  if (pathname.startsWith("/work/")) return <><CustomCursor />{chat ? <ChatBubble /> : null}</>;

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
      {chat ? <ChatBubble /> : null}
    </>
  );
}


