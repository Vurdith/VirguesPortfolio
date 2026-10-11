"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

const FIELD =
  "mt-2 w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink placeholder:text-fog/40";

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Could not change password.");
      }
      setCurrent("");
      setNext("");
      setStatus("done");
      router.refresh();
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Could not change password.");
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4">
      <label className="block">
        <span className="text-[10px] tracking-[0.22em] text-fog/70">CURRENT PASSWORD</span>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className="text-[10px] tracking-[0.22em] text-fog/70">NEW PASSWORD</span>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={FIELD}
          placeholder="10+ characters"
        />
      </label>
      <p role="status" className="min-h-4 text-xs text-fog/80">
        {error ?? (status === "done" ? "Password changed. Other devices were signed out." : "")}
      </p>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={status === "submitting" || !current || next.length < 10}
          className={cn(
            "inline-flex items-center gap-3 border border-line/18 bg-void/40 px-5 py-3 text-xs tracking-[0.22em] text-ink transition-[border-color,transform,opacity] duration-300",
            "hover:-translate-y-px hover:border-line/35 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span>CHANGE PASSWORD</span>
          <span className="h-px w-10 bg-line/20" />
        </button>
      </div>
    </form>
  );
}
