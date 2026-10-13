"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { cn } from "@/lib/cn";

export type NavCounts = { quotes: number; briefs: number; reviews: number };

const ICONS = {
  dashboard: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  works: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  quotes: <path d="M4 5h16v11H8l-4 4V5Zm4 4h8M8 12h5" />,
  briefs: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12Zm-12.5-.5h.01M12 11.5h.01m3.49 0h.01" />,
  reviews: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />,
  site: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
} as const;

function Icon({ name, className }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-[18px]", className)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const NAV = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Briefs", href: "/admin/briefs", icon: "briefs", count: "briefs" },
  { label: "Quotes", href: "/admin/quotes", icon: "quotes", count: "quotes" },
  { label: "Works", href: "/admin/works", icon: "works" },
  { label: "Reviews", href: "/admin/reviews", icon: "reviews", count: "reviews" },
] as const;

export function AdminShell({ children, counts }: { children: React.ReactNode; counts: NavCounts }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname?.startsWith(href));

  return (
    <div className="relative min-h-dvh bg-void lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div aria-hidden="true" className="admin-aurora">
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden="true" className="section-grid-bg pointer-events-none fixed inset-0 opacity-[0.035]" />

      <aside className="sticky top-0 z-40 hidden h-dvh flex-col border-r border-line/10 bg-void/70 px-3 py-5 backdrop-blur-xl lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2.5 px-3 text-ink">
          <span className="grid size-8 place-items-center rounded-full bg-ink font-serif text-base leading-none text-void">V</span>
          <span className="font-serif text-lg leading-none tracking-[-0.03em]">Virguê</span>
        </Link>

        <nav aria-label="Admin navigation" className="flex-1">
          <LayoutGroup id="admin-side">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active = isActive(item.href);
                const count = "count" in item ? counts[item.count] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-200",
                        active ? "text-ink" : "text-fog/70 hover:text-ink",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="admin-side-active"
                          aria-hidden="true"
                          className="absolute inset-0 rounded-xl border border-line/15 bg-white/[0.07]"
                          transition={{ type: "spring", stiffness: 480, damping: 38 }}
                        />
                      ) : (
                        <span aria-hidden="true" className="absolute inset-0 rounded-xl bg-white/[0.04] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      )}
                      <Icon name={item.icon} className="relative transition-transform duration-200 group-hover:scale-110" />
                      <span className="relative flex-1">{item.label}</span>
                      <CountBadge count={count} className="relative" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </LayoutGroup>
        </nav>

        <div className="space-y-1 border-t border-line/10 pt-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-fog/65 transition-colors hover:bg-white/[0.04] hover:text-ink"
          >
            <Icon name="site" />
            View site
          </Link>
          <AdminLogoutButton />
        </div>
      </aside>

      <main id="main" tabIndex={-1} className="relative z-10 min-w-0 pb-[4.75rem] outline-none lg:pb-0">
        {children}
      </main>

      <nav
        aria-label="Admin navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line/10 bg-void/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <LayoutGroup id="admin-bottom">
          <ul className="grid grid-cols-5">
            {NAV.map((item) => {
              const active = isActive(item.href);
              const count = "count" in item ? counts[item.count] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("relative flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] transition-colors", active ? "text-ink" : "text-fog/60")}
                  >
                    {active ? (
                      <motion.span
                        layoutId="admin-bottom-active"
                        aria-hidden="true"
                        className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-ink"
                        transition={{ type: "spring", stiffness: 480, damping: 38 }}
                      />
                    ) : null}
                    <span className="relative">
                      <Icon name={item.icon} />
                      <CountBadge count={count} dot className="absolute -right-2 -top-1.5" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>
    </div>
  );
}

/** How many things in a section are waiting on you. Pops in when the number changes. */
function CountBadge({ count, dot, className }: { count: number; dot?: boolean; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {count > 0 ? (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className={cn(
            "inline-grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-medium leading-none text-void tabular-nums",
            dot && "h-4 min-w-4 px-1 text-[10px]",
            className,
          )}
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
