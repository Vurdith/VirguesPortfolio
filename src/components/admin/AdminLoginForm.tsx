"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";

export function AdminLoginForm({ mode }: { mode: "setup" | "login" }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [password, setPassword] = React.useState("");
  const [setupToken, setSetupToken] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const endpoint = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "setup" ? { password, setupToken } : { password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Auth failed.");
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed.");
      setStatus("error");
      return;
    }
    setStatus("idle");
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-12 md:px-10">
      <div aria-hidden="true" className="section-grid-bg fixed inset-0 opacity-[0.045]" />
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[radial-gradient(760px_460px_at_50%_30%,rgba(255,255,255,.12),transparent_68%)]"
      />
      <motion.div
        className="relative w-full max-w-xl"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative overflow-hidden border border-line/14 bg-void/80 p-7 md:p-8">
          <CornerLines />
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-[0.22em] text-fog/70">ADMIN</div>
            <div className="text-[11px] tracking-[0.22em] text-fog/70">
              {mode === "setup" ? "INITIAL SETUP" : "LOGIN"}
            </div>
          </div>

          <h1 className="mt-6 font-serif text-3xl leading-[0.95] tracking-[-0.05em]">
            {mode === "setup" ? "Set the key." : "Enter."}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-fog/80">
            {mode === "setup"
              ? "This password is stored hashed for the dashboard. You’ll use it to access works and reviews."
              : "Secure login for works + review moderation."}
          </p>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="text-[11px] tracking-[0.22em] text-fog/70">PASSWORD</span>
              <div className="relative mt-2">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line/12 bg-void/35 py-3 pl-3 pr-16 text-sm text-ink outline-none transition-colors placeholder:text-fog/40 focus:border-line/40"
                  placeholder={mode === "setup" ? "Create a strong password (10+ chars)" : "Password"}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  aria-pressed={show}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] tracking-[0.2em] text-fog/60 transition-colors hover:text-ink"
                >
                  {show ? "HIDE" : "SHOW"}
                </button>
              </div>
            </label>

            {mode === "setup" ? (
              <label className="mt-5 block">
                <span className="text-[11px] tracking-[0.22em] text-fog/70">SETUP TOKEN</span>
                <input
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  className="mt-2 w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
                  placeholder="ADMIN_SETUP_TOKEN (required in production)"
                />
              </label>
            ) : null}

            {error ? (
              <div role="alert" className="mt-3 text-xs text-fog/80">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="submit"
                disabled={status === "submitting" || password.length < (mode === "setup" ? 10 : 1)}
                className={cn(
                  "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-300",
                  "hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <span>{status === "submitting" ? "CHECKING…" : mode === "setup" ? "SET PASSWORD" : "LOGIN"}</span>
                <span className="h-px w-10 bg-line/20" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </main>
  );
}

function CornerLines() {
  return (
    <span className="pointer-events-none absolute inset-0 opacity-70">
      <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-line/30" />
      <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-line/30" />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-line/30" />
      <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-line/30" />
    </span>
  );
}


