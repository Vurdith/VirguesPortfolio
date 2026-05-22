"use client";

import { useRouter } from "next/navigation";

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
    <button
      type="button"
      onMouseEnter={playHover}
      onClick={() => {
        playClick();
        void logout();
      }}
      className={cn(
        "inline-flex h-9 items-center gap-3 border border-line/18 bg-void/40 px-4 text-xs tracking-[0.22em] text-fog/80 transition-[border-color,color,transform] duration-300",
        "hover:-translate-y-px hover:border-line/35 hover:text-ink active:translate-y-0 active:scale-[0.985]",
        className,
      )}
    >
      <span>LOGOUT</span>
      <span className="h-px w-8 bg-line/15" />
    </button>
  );
}



