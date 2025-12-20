"use client";

import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";

import { UiSoundProvider } from "@/providers/UiSoundProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <UiSoundProvider>{children}</UiSoundProvider>
      </LazyMotion>
    </MotionConfig>
  );
}



