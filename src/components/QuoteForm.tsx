"use client";

import * as React from "react";

import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";
import { QUOTE_BUDGETS, QUOTE_LIMITS, QUOTE_SERVICES } from "@/lib/quoteLimits";
import { SITE } from "@/lib/site";

type SubmitState = "idle" | "submitting" | "sent" | "error";

const FIELD =
  "mt-2 w-full border border-line/12 bg-void/35 px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/40 focus:border-line/35";
const LABEL = "text-[10px] tracking-[0.22em] text-fog/70";

export function QuoteForm({ className }: { className?: string }) {
  const [state, setState] = React.useState({
    name: "",
    email: "",
    service: QUOTE_SERVICES[0] as string,
    budget: QUOTE_BUDGETS[4] as string,
    deadline: "",
    details: "",
    company: "", // honeypot
  });
  const [status, setStatus] = React.useState<SubmitState>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const set =
    (key: keyof typeof state) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setState((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting" || status === "sent") return;

    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Could not send. Try the email instead.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send. Try the email instead.");
    }
  };

  if (status === "sent") {
    return (
      <div
        className={cn("relative border border-line/18 bg-void/30 p-6 backdrop-blur-sm", className)}
        role="status"
      >
        <p className="text-xs tracking-[0.22em] text-fog/70">RECEIVED</p>
        <h3 className="mt-3 font-serif text-3xl leading-[0.95] tracking-[-0.05em]">
          Got it. I’ll reply soon.
        </h3>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fog/80">
          Your request is in. Expect a reply at {state.email}, usually within a day or two.
        </p>
        <CornerMarks className="opacity-80" />
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn("relative border border-line/12 bg-void/25 p-6 backdrop-blur-sm", className)}
      aria-label="Request a quote"
    >
      <div className="text-xs tracking-[0.22em] text-fog/70">REQUEST A QUOTE</div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={LABEL}>NAME</span>
          <input
            required
            minLength={QUOTE_LIMITS.name.min}
            maxLength={QUOTE_LIMITS.name.max}
            value={state.name}
            onChange={set("name")}
            autoComplete="name"
            placeholder="Your name"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>EMAIL</span>
          <input
            required
            type="email"
            maxLength={160}
            value={state.email}
            onChange={set("email")}
            autoComplete="email"
            placeholder="you@studio.com"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>WHAT DO YOU NEED?</span>
          <select value={state.service} onChange={set("service")} className={FIELD}>
            {QUOTE_SERVICES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>BUDGET</span>
          <select value={state.budget} onChange={set("budget")} className={FIELD}>
            {QUOTE_BUDGETS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className={LABEL}>DEADLINE (OPTIONAL)</span>
        <input
          maxLength={QUOTE_LIMITS.deadline.max}
          value={state.deadline}
          onChange={set("deadline")}
          placeholder="e.g. end of next month"
          className={FIELD}
        />
      </label>

      <label className="mt-4 block">
        <span className={LABEL}>PROJECT DETAILS</span>
        <textarea
          required
          minLength={QUOTE_LIMITS.details.min}
          maxLength={QUOTE_LIMITS.details.max}
          value={state.details}
          onChange={set("details")}
          placeholder="What are you building, and what should the UI do?"
          className={cn(FIELD, "h-32 resize-none")}
        />
        <span className="mt-1 block text-right text-[10px] tabular-nums text-fog/72">
          {state.details.trim().length}/{QUOTE_LIMITS.details.max}
        </span>
      </label>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={state.company} onChange={set("company")} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-fog/70" aria-live="polite">
          {status === "error" ? (
            <span className="text-ink/90">{error}</span>
          ) : (
            <>
              Or email{" "}
              <a className="underline-offset-4 hover:underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            </>
          )}
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "inline-flex items-center gap-3 border border-line/20 bg-ink px-5 py-3 text-xs tracking-[0.22em] text-void transition-[transform,opacity] duration-300",
            "hover:-translate-y-px active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <span>{status === "submitting" ? "SENDING" : "SEND REQUEST"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <CornerMarks className="opacity-80" />
    </form>
  );
}
