"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

type Phase = "idle" | "covering" | "revealing";

type TransitionApi = {
  /** Navigates with a wipe. Pass "back" to go back in history. */
  navigate: (href: string) => void;
};

const COVER_MS = 480;
const REVEAL_MS = 620;
const MAX_WAIT_MS = 4000;
const EASE = [0.76, 0, 0.24, 1] as const;

const PageTransitionContext = React.createContext<TransitionApi | null>(null);

export function usePageTransition() {
  const ctx = React.useContext(PageTransitionContext);
  if (!ctx) throw new Error("usePageTransition must be used within <PageTransitionProvider />");
  return ctx;
}

function isAdminPath(path: string) {
  return path.startsWith("/admin");
}

/**
 * Wipes a panel across the screen between pages. Plain internal link clicks are intercepted, the
 * panel covers the page, the route changes underneath it, then the panel lifts away.
 */
export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [phase, setPhase] = React.useState<Phase>("idle");
  const phaseRef = React.useRef<Phase>("idle");
  const timersRef = React.useRef<number[]>([]);

  const setPhaseBoth = React.useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const later = React.useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  React.useEffect(() => {
    const timers = timersRef;
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  const reveal = React.useCallback(() => {
    if (phaseRef.current !== "covering") return;
    setPhaseBoth("revealing");
    later(() => setPhaseBoth("idle"), REVEAL_MS);
  }, [later, setPhaseBoth]);

  const navigate = React.useCallback(
    (href: string) => {
      const go = () => (href === "back" ? router.back() : router.push(href));
      if (reduceMotion || phaseRef.current !== "idle") {
        go();
        return;
      }

      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];

      setPhaseBoth("covering");
      later(go, COVER_MS);
      // If the route never changes (same page, error), do not leave the screen covered.
      later(reveal, MAX_WAIT_MS);
    },
    [later, reduceMotion, reveal, router, setPhaseBoth],
  );

  // The new route has rendered: lift the panel.
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    reveal();
  }, [pathname, reveal]);

  // Intercept ordinary same-origin link clicks that change the page.
  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) {
        // Jump to a section on this page ourselves: the router's own hash scrolling can leave the
        // page where it is on the first click.
        const target = url.hash.length > 1 ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
          window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        }
        return;
      }
      if (isAdminPath(url.pathname) || isAdminPath(window.location.pathname)) return;

      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate, reduceMotion]);

  const api = React.useMemo<TransitionApi>(() => ({ navigate }), [navigate]);

  return (
    <PageTransitionContext.Provider value={api}>
      {children}
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 z-[300] grid place-items-center bg-void"
        style={{ pointerEvents: phase === "idle" ? "none" : "auto" }}
        initial={false}
        animate={{ y: phase === "covering" ? "0%" : phase === "revealing" ? "-100%" : "100%" }}
        transition={
          phase === "idle"
            ? { duration: 0 }
            : { duration: (phase === "covering" ? COVER_MS : REVEAL_MS) / 1000, ease: EASE }
        }
      >
        <span className="absolute inset-x-0 top-0 h-px bg-line/40" />
        <motion.span
          className="font-serif text-2xl italic tracking-[-0.03em] text-ink/70"
          animate={{ opacity: phase === "covering" ? 1 : 0 }}
          transition={{ duration: 0.25, delay: phase === "covering" ? 0.2 : 0 }}
        >
          Virguê.
        </motion.span>
      </motion.div>
    </PageTransitionContext.Provider>
  );
}
