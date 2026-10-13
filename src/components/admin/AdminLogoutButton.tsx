"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

export function AdminLogoutButton({ className }: { className?: string }) {
  const router = useRouter();

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
      onClick={() => void logout()}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-fog/65 transition-colors hover:bg-white/[0.04] hover:text-ink",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" />
      </svg>
      Log out
    </button>
  );
}
