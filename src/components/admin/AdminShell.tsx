"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-void">
      <div aria-hidden="true" className="section-grid-bg fixed inset-0 opacity-[0.045]" />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(900px_520px_at_50%_-10%,rgba(255,255,255,.12),transparent_62%),radial-gradient(900px_620px_at_78%_18%,rgba(255,255,255,.055),transparent_60%)]"
      />

      <header className="sticky top-0 z-40 border-b border-line/10 bg-void/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 md:px-8">
          <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <div
              className={cn(
                "relative inline-flex items-baseline gap-2 text-xs tracking-[0.22em] text-ink",
              )}
            >
              <span className="font-serif text-sm tracking-[-0.02em]">A</span>
              <span className="text-fog/70">/</span>
              <span className="text-fog/70">ADMIN</span>
            </div>

            <nav className="flex flex-wrap items-center gap-2 md:justify-center" aria-label="Admin navigation">
              {NAV.map((item) => (
                <AdminNavLink
                  active={
                    item.href === "/admin"
                      ? pathname === item.href
                      : pathname?.startsWith(item.href)
                  }
                  href={item.href}
                  key={item.href}
                  label={item.label}
                  onClick={playClick}
                  onHover={playHover}
                />
              ))}
            </nav>

            <div className="justify-self-start md:justify-self-end">
              <AdminLogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}

function AdminNavLink({
  active,
  href,
  label,
  onClick,
  onHover,
}: {
  active?: boolean;
  href: string;
  label: string;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-9 min-w-24 items-center justify-center border border-line/12 bg-void/35 px-4 text-[10px] tracking-[0.22em] text-fog/70 transition-[border-color,color,background-color,transform] duration-300 hover:-translate-y-px hover:border-line/30 hover:bg-void/55 hover:text-ink",
        active && "border-line/30 bg-white/[0.035] text-ink"
      )}
    >
      {label}
    </Link>
  );
}
