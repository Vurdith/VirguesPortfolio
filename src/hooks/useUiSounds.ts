"use client";

import * as React from "react";

import { UiSoundContext } from "@/providers/UiSoundProvider";

export function useUiSounds() {
  const ctx = React.useContext(UiSoundContext);
  if (!ctx) throw new Error("useUiSounds must be used within <UiSoundProvider />");
  return ctx;
}



