"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { adminInput } from "@/components/admin/ui";

const FIELD = `mt-2 ${adminInput}`;

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
        <span className="text-xs text-fog/65">Current password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={FIELD}
        />
      </label>
      <label className="block">
        <span className="text-xs text-fog/65">New password</span>
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
          className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-6 text-[11px] tracking-[0.2em] text-void transition-[opacity,transform] hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "submitting" ? "SAVING…" : "CHANGE PASSWORD"}
        </button>
      </div>
    </form>
  );
}
