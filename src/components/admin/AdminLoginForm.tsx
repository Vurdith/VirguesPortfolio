"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";
import { useUiSounds } from "@/hooks/useUiSounds";

export function AdminLoginForm({ mode }: { mode: "setup" | "login" }) {
  const router = useRouter();
  const { playHover, playClick } = useUiSounds();

  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setStatus("submitting");
    setError(null);
    try {
      const endpoint = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Auth failed.");
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Auth failed.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-12 md:px-10">
      <div aria-hidden="true" className="section-grid-bg fixed inset-0 opacity-[0.045]" />
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[radial-gradient(760px_460px_at_50%_30%,rgba(255,255,255,.12),transparent_68%)]"
      />
      <div className="relative w-full max-w-xl">
        <div className="relative overflow-hidden border border-line/14 bg-void/45 p-7 backdrop-blur-xl md:p-8">
          <CornerLines />
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-[0.22em] text-fog/70">ADMIN</div>
            <div className="text-[10px] tracking-[0.22em] text-fog/50">
              {mode === "setup" ? "INITIAL SETUP" : "LOGIN"}
            </div>
          </div>

          <h1 className="mt-6 font-serif text-3xl leading-[0.95] tracking-[-0.05em]">
            {mode === "setup" ? "Set the key." : "Enter."}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-fog/80">
            {mode === "setup"
              ? "This password is stored hashed in your local db.json. You’ll use it to access the dashboard."
              : "Secure login for works + review moderation."}
          </p>

          <div className="mt-8">
            <label className="block">
              <span className="text-[10px] tracking-[0.22em] text-fog/70">PASSWORD</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40"
                placeholder={mode === "setup" ? "Create a strong password (10+ chars)" : "Password"}
                autoFocus
              />
            </label>

            {error ? <div className="mt-3 text-xs text-fog/80">{error}</div> : null}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onMouseEnter={playHover}
                onClick={() => {
                  playClick();
                  void submit();
                }}
                disabled={status === "submitting" || password.length < (mode === "setup" ? 10 : 1)}
                className={cn(
                  "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-300",
                  "hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <span>{mode === "setup" ? "SET PASSWORD" : "LOGIN"}</span>
                <span className="h-px w-10 bg-line/20" />
              </button>
            </div>
          </div>
        </div>
      </div>
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


