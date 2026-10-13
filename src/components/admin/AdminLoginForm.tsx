"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

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
      <div aria-hidden="true" className="admin-aurora">
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden="true" className="section-grid-bg fixed inset-0 opacity-[0.035]" />
      <motion.div
        className="relative w-full max-w-md"
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-line/10 bg-void/70 p-7 backdrop-blur-xl md:p-9">
          <span className="grid size-12 place-items-center rounded-full bg-ink font-serif text-2xl leading-none text-void">V</span>
          <h1 className="mt-6 font-serif text-4xl leading-[0.95] tracking-[-0.05em]">{mode === "setup" ? "Set a password" : "Welcome back"}</h1>
          {mode === "setup" ? (
            <p className="mt-3 text-sm leading-relaxed text-fog/70">Stored hashed. You&apos;ll use it to sign in to the dashboard.</p>
          ) : null}

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="text-xs text-fog/65">Password</span>
              <div className="relative mt-2">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-line/10 bg-void/35 py-3 pl-3 pr-16 text-sm text-ink outline-none transition-colors placeholder:text-fog/40 focus:border-line/40"
                  placeholder={mode === "setup" ? "10+ characters" : "Password"}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  aria-pressed={show}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-fog/60 transition-colors hover:text-ink"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {mode === "setup" ? (
              <label className="mt-5 block">
                <span className="text-xs text-fog/65">Setup token</span>
                <input
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-line/10 bg-white/[0.03] px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/40 focus:border-line/40"
                  placeholder="Required in production"
                />
              </label>
            ) : null}

            {error ? (
              <div role="alert" className="mt-3 text-xs text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={status === "submitting" || password.length < (mode === "setup" ? 10 : 1)}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-xs tracking-[0.22em] text-void transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "submitting" ? "CHECKING…" : mode === "setup" ? "SET PASSWORD" : "SIGN IN"}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
