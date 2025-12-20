"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function AdminLogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { playHover, playClick } = useUiSounds();

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <motion.button
      type="button"
      onMouseEnter={playHover}
      onClick={() => {
        playClick();
        void logout();
      }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-4 py-2 text-xs tracking-[0.22em] text-fog/80",
        "hover:border-line/35 hover:text-ink",
        className,
      )}
    >
      <span>LOGOUT</span>
      <span className="h-px w-8 bg-line/15" />
    </motion.button>
  );
}



