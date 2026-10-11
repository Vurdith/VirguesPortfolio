"use client";

import * as React from "react";

import { CornerMarks } from "@/components/CornerMarks";
import { cn } from "@/lib/cn";
import { QUOTE_BUDGETS, QUOTE_DEADLINES, QUOTE_LIMITS, QUOTE_SERVICES } from "@/lib/quoteLimits";
import { SITE } from "@/lib/site";

type SubmitState = "idle" | "submitting" | "sent" | "error";
type Fields = {
  service: string;
  details: string;
  budget: string;
  deadline: string;
  name: string;
  email: string;
  company: string; // honeypot
};
type Touched = Partial<Record<"details" | "name" | "email", boolean>>;

const DRAFT_KEY = "ui:quoteDraft";
const EMPTY: Fields = {
  service: "",
  details: "",
  budget: "Not sure yet",
  deadline: "Flexible",
  name: "",
  email: "",
  company: "",
};

const INPUT =
  "mt-2 w-full border bg-void/35 px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-fog/50 focus:border-line/50";
const LABEL = "text-[10px] tracking-[0.22em] text-fog/72";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One message per problem, written to say what to do rather than what went wrong. */
function validate(fields: Fields) {
  const errors: Partial<Record<"service" | "details" | "name" | "email", string>> = {};
  if (!fields.service) errors.service = "Pick what you need.";
  const detailsLength = fields.details.trim().length;
  if (detailsLength < QUOTE_LIMITS.details.min) {
    errors.details = `A little more detail helps: ${QUOTE_LIMITS.details.min - detailsLength} more characters.`;
  }
  if (fields.name.trim().length < QUOTE_LIMITS.name.min) errors.name = "Add your name.";
  if (!EMAIL_PATTERN.test(fields.email.trim())) errors.email = "Add an email I can reply to.";
  return errors;
}

export function QuoteForm({ className }: { className?: string }) {
  const [fields, setFields] = React.useState<Fields>(EMPTY);
  const [touched, setTouched] = React.useState<Touched>({});
  const [attempted, setAttempted] = React.useState(false);
  const [status, setStatus] = React.useState<SubmitState>("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Restore an unsent draft so a refresh or an accidental navigation does not lose the message.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) setFields((current) => ({ ...current, ...(JSON.parse(saved) as Partial<Fields>), company: "" }));
    } catch {
      // Storage can be blocked or hold bad data; start empty.
    }
  }, []);

  React.useEffect(() => {
    if (status === "sent") return;
    try {
      const { company: _company, ...draft } = fields;
      void _company;
      const hasContent = draft.details || draft.name || draft.email || draft.service;
      if (hasContent) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [fields, status]);

  const errors = validate(fields);
  const show = (key: keyof Touched | "service") =>
    attempted || (key !== "service" && touched[key as keyof Touched]) ? errors[key] : undefined;

  const update = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setFields((current) => ({ ...current, [key]: value }));
  const blur = (key: keyof Touched) => setTouched((current) => ({ ...current, [key]: true }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting" || status === "sent") return;

    setAttempted(true);
    const firstError = (["service", "details", "name", "email"] as const).find((key) => errors[key]);
    if (firstError) {
      // Bring the first problem into view and focus it.
      const target = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstError}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.focus({ preventScroll: true });
      return;
    }

    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Could not send. Try the email instead.");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Could not send. Try the email instead.");
    }
  };

  const reset = () => {
    setFields(EMPTY);
    setTouched({});
    setAttempted(false);
    setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div
        className={cn("relative border border-line/18 bg-void/30 p-6 backdrop-blur-sm md:p-8", className)}
        role="status"
      >
        <p className="text-xs tracking-[0.22em] text-fog/72">RECEIVED</p>
        <h3 className="mt-3 font-serif text-3xl leading-[0.95] tracking-[-0.05em] md:text-4xl">
          Got it, {fields.name.trim().split(" ")[0]}.
        </h3>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fog/80">
          I’ll reply to {fields.email.trim()} within a day or two with questions or a price. If
          it’s urgent, email{" "}
          <a className="text-ink underline underline-offset-4" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 text-[10px] tracking-[0.22em] text-fog/72 underline-offset-4 hover:text-ink hover:underline"
        >
          SEND ANOTHER
        </button>
        <CornerMarks className="opacity-80" />
      </div>
    );
  }

  const detailsLength = fields.details.trim().length;
  const detailsError = show("details");

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className={cn("relative border border-line/12 bg-void/25 p-6 backdrop-blur-sm md:p-8", className)}
      aria-label="Request a quote"
    >
      <h3 className="font-serif text-2xl leading-none tracking-[-0.04em] md:text-3xl">
        Tell me about the project.
      </h3>
      <p className="mt-3 text-sm text-fog/72">Takes about a minute. I reply within a day or two.</p>

      <Group
        legend="WHAT DO YOU NEED?"
        error={show("service")}
        className="mt-8"
      >
        {QUOTE_SERVICES.map((option, index) => (
          <Chip
            key={option}
            name="service"
            value={option}
            checked={fields.service === option}
            onChange={() => update("service", option)}
            fieldRef={index === 0 ? "service" : undefined}
          >
            {option}
          </Chip>
        ))}
      </Group>

      <div className="mt-6">
        <label htmlFor="quote-details" className={LABEL}>
          PROJECT DETAILS
        </label>
        <textarea
          id="quote-details"
          data-field="details"
          value={fields.details}
          maxLength={QUOTE_LIMITS.details.max}
          onChange={(event) => update("details", event.target.value)}
          onBlur={() => blur("details")}
          aria-invalid={Boolean(detailsError)}
          aria-describedby="quote-details-hint"
          placeholder="What are you building? What should the UI do, and what should it feel like?"
          className={cn(INPUT, "h-36 resize-y", detailsError ? "border-red-300/60" : "border-line/12")}
        />
        <p
          id="quote-details-hint"
          className={cn("mt-1.5 text-xs", detailsError ? "text-red-200" : "text-fog/60")}
          aria-live="polite"
        >
          {detailsError ??
            (detailsLength >= QUOTE_LIMITS.details.min
              ? `${QUOTE_LIMITS.details.max - detailsLength} characters left`
              : "Links to references or screenshots are welcome.")}
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Group legend="BUDGET">
          {QUOTE_BUDGETS.map((option) => (
            <Chip
              key={option}
              name="budget"
              value={option}
              checked={fields.budget === option}
              onChange={() => update("budget", option)}
            >
              {option}
            </Chip>
          ))}
        </Group>
        <Group legend="TIMELINE">
          {QUOTE_DEADLINES.map((option) => (
            <Chip
              key={option}
              name="deadline"
              value={option}
              checked={fields.deadline === option}
              onChange={() => update("deadline", option)}
            >
              {option}
            </Chip>
          ))}
        </Group>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <TextField
          id="quote-name"
          field="name"
          label="NAME"
          value={fields.name}
          error={show("name")}
          autoComplete="name"
          placeholder="Your name"
          maxLength={QUOTE_LIMITS.name.max}
          onChange={(value) => update("name", value)}
          onBlur={() => blur("name")}
        />
        <TextField
          id="quote-email"
          field="email"
          label="EMAIL"
          type="email"
          value={fields.email}
          error={show("email")}
          autoComplete="email"
          placeholder="you@studio.com"
          maxLength={160}
          onChange={(value) => update("email", value)}
          onBlur={() => blur("email")}
        />
      </div>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={fields.company}
            onChange={(event) => update("company", event.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fog/72" aria-live="polite">
          {status === "error" ? (
            <span className="text-red-200">{serverError}</span>
          ) : (
            <>
              Prefer email?{" "}
              <a className="text-ink underline-offset-4 hover:underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            </>
          )}
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "inline-flex items-center justify-center gap-3 border border-ink bg-ink px-6 py-3.5 text-xs font-medium tracking-[0.22em] text-void transition-[transform,opacity,background-color] duration-300",
            "hover:-translate-y-px hover:bg-white active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70",
          )}
        >
          <span>{status === "submitting" ? "SENDING…" : "SEND REQUEST"}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <CornerMarks className="opacity-80" />
    </form>
  );
}

function Group({
  legend,
  error,
  className,
  children,
}: {
  legend: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={className}>
      <legend className={LABEL}>{legend}</legend>
      <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
        {children}
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** A real radio input, so keyboard and screen-reader behaviour comes for free; the label is the chip. */
function Chip({
  name,
  value,
  checked,
  onChange,
  fieldRef,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  fieldRef?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        data-field={fieldRef}
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
      />
      <span
        className={cn(
          "inline-flex items-center border px-3.5 py-2 text-xs text-fog/85 transition-colors duration-200",
          "border-line/15 bg-void/35 hover:border-line/35 hover:text-ink",
          "peer-checked:border-ink peer-checked:bg-ink peer-checked:text-void",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink/85",
        )}
      >
        {children}
      </span>
    </label>
  );
}

function TextField({
  id,
  field,
  label,
  value,
  error,
  type = "text",
  autoComplete,
  placeholder,
  maxLength,
  onChange,
  onBlur,
}: {
  id: string;
  field: string;
  label: string;
  value: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        data-field={field}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, error ? "border-red-300/60" : "border-line/12")}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
