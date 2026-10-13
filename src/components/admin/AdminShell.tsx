"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";

import { cn } from "@/lib/cn";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const NAV = [
  { label: "DASHBOARD", href: "/admin" },
  { label: "WORKS", href: "/admin/works" },
  { label: "QUOTES", href: "/admin/quotes" },
  { label: "BRIEFS", href: "/admin/briefs" },
  { label: "REVIEWS", href: "/admin/reviews" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname?.startsWith(href));

  return (
    <div className="relative min-h-dvh bg-void">
      <div aria-hidden="true" className="section-grid-bg fixed inset-0 opacity-[0.045]" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[520px] bg-[radial-gradient(900px_520px_at_50%_-10%,rgba(255,255,255,.1),transparent_62%)]"
      />

      <header className="sticky top-0 z-40 border-b border-line/10 bg-void/95">
        <div className="mx-auto max-w-7xl px-5 py-3 md:px-8">
          <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
            <Link
              href="/admin"
              className="relative inline-flex items-baseline gap-2 text-xs tracking-[0.22em] text-ink"
            >
              <span className="font-serif text-sm tracking-[-0.02em]">V</span>
              <span className="text-fog/70">/</span>
              <span className="text-fog/70">ADMIN</span>
            </Link>

            <nav aria-label="Admin navigation" className="md:justify-self-center">
              <LayoutGroup id="admin-nav">
                <ul className="flex flex-wrap items-center gap-1">
                  {NAV.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative inline-flex h-9 items-center px-4 text-[11px] tracking-[0.22em] transition-colors duration-200",
                            active ? "text-ink" : "text-fog/65 hover:text-ink",
                          )}
                        >
                          {item.label}
                          {active ? (
                            <motion.span
                              layoutId="admin-nav-active"
                              aria-hidden="true"
                              className="absolute inset-x-3 -bottom-[13px] h-px bg-ink"
                              transition={{ type: "spring", stiffness: 520, damping: 40 }}
                            />
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </LayoutGroup>
            </nav>

            <div className="flex items-center gap-4 md:justify-self-end">
              <Link
                href="/"
                target="_blank"
                rel="noopener"
                className="text-[11px] tracking-[0.22em] text-fog/65 transition-colors hover:text-ink"
              >
                VIEW SITE ↗
              </Link>
              <AdminLogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
        {children}
      </main>
    </div>
  );
}
