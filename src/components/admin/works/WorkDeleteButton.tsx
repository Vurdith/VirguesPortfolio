"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function WorkDeleteButton({ id, className }: { id: string; className?: string }) {
  const router = useRouter();
  const { playHover, playClick } = useUiSounds();

  const [busy, setBusy] = React.useState(false);

  const onDelete = async () => {
    if (busy) return;
    const ok = window.confirm("Delete this work? This cannot be undone.");
    if (!ok) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/works/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      type="button"
      disabled={busy}
      onMouseEnter={playHover}
      onClick={() => {
        playClick();
        void onDelete();
      }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center border border-line/12 bg-void/35 px-3 py-2 text-[10px] tracking-[0.22em] text-fog/70",
        "hover:border-line/25 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      DEL
    </motion.button>
  );
}



