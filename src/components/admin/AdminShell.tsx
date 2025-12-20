"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { useUiSounds } from "@/hooks/useUiSounds";

const NAV = [
  { label: "DASHBOARD", href: "/admin" },
  { label: "WORKS", href: "/admin/works" },
  { label: "REVIEWS", href: "/admin/reviews" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { playHover, playClick } = useUiSounds();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/10 bg-void/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 md:px-10">
          <div className="flex items-center justify-between gap-4">
            <div
              className={cn(
                "relative inline-flex items-baseline gap-2 text-xs tracking-[0.22em] text-ink",
              )}
            >
              <span className="font-serif text-sm tracking-[-0.02em]">A</span>
              <span className="text-fog/70">/</span>
              <span className="text-fog/70">ADMIN</span>
            </div>

            <nav className="hidden items-center gap-6 md:flex" aria-label="Admin navigation">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={playHover}
                  onClick={playClick}
                  className="text-xs tracking-[0.22em] text-fog/70 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
