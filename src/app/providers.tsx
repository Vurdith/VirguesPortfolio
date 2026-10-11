"use client";

import { LazyMotion, domAnimation } from "framer-motion";

import { PageTransitionProvider } from "@/components/PageTransition";
import { MotionPreferenceProvider } from "@/providers/MotionPreferenceProvider";
import { UiSoundProvider } from "@/providers/UiSoundProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionPreferenceProvider>
      <LazyMotion features={domAnimation}>
        <UiSoundProvider>
          <PageTransitionProvider>{children}</PageTransitionProvider>
        </UiSoundProvider>
      </LazyMotion>
    </MotionPreferenceProvider>
  );
}



