"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import Link from "next/link";

import { CornerMarks } from "@/components/CornerMarks";
import { TurnstileWidget, turnstileConfigured } from "@/components/TurnstileWidget";
import { useUiSounds } from "@/hooks/useUiSounds";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import {
  QUOTE_BUDGET_STEPS,
  QUOTE_BUDGET_UNSURE,
  QUOTE_CONTACTS,
  QUOTE_CONTACT_INFO,
  QUOTE_DEADLINES,
  QUOTE_LIMITS,
  QUOTE_SERVICES,
  QUOTE_SERVICE_HINTS,
  cleanHandle,
  isValidContact,
  type QuoteContact,
} from "@/lib/quoteLimits";
import { SITE } from "@/lib/site";

type SubmitState = "idle" | "submitting" | "sent" | "error";
type Fields = {
  service: string;
  details: string;
  budget: string;
  deadline: string;
  name: string;
  /** Which ways to reach the visitor are switched on. Any combination is allowed. */
  methods: QuoteContact[];
  email: string;
  discord: string;
  x: string;
  company: string; // honeypot
};
type FieldKey = "service" | "details" | "name" | "contact" | QuoteContact;
type Errors = Partial<Record<FieldKey, string>>;

const STEPS = [
  { title: "What do you need?", label: "NEED", fields: ["service"] },
  { title: "Tell me about it.", label: "DETAILS", fields: ["details"] },
  { title: "Budget and timing.", label: "SCOPE", fields: [] },
  { title: "Where do I reply?", label: "CONTACT", fields: ["name", "contact", "email", "discord", "x"] },
] as const satisfies readonly { title: string; label: string; fields: readonly FieldKey[] }[];

const DRAFT_KEY = "ui:quoteDraft";
const EASE = [0.22, 1, 0.36, 1] as const;
const EMPTY: Fields = {
  service: "",
  details: "",
  budget: QUOTE_BUDGET_UNSURE,
  deadline: "Flexible",
  name: "",
  methods: ["email"],
  email: "",
  discord: "",
  x: "",
  company: "",
};

const LABEL = "text-[11px] tracking-[0.22em] text-fog/72";
const FIELD =
  "mt-2 w-full border bg-void/35 px-4 py-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-fog/50 focus:border-ink/70 focus:shadow-[0_0_0_4px_rgb(255_255_255/0.06)] md:text-sm";

/** One message per problem, written to say what to do rather than what went wrong. */
function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.service) errors.service = "Pick what you need to continue.";
  const detailsLength = fields.details.trim().length;
  if (detailsLength < QUOTE_LIMITS.details.min) {
    errors.details = `A little more detail helps: ${QUOTE_LIMITS.details.min - detailsLength} more characters.`;
  }
  if (fields.name.trim().length < QUOTE_LIMITS.name.min) errors.name = "Add your name.";
  if (!fields.methods.length) errors.contact = "Pick at least one way for me to reach you.";
  for (const method of fields.methods) {
    if (!isValidContact(method, fields[method])) errors[method] = QUOTE_CONTACT_INFO[method].invalid;
  }
  return errors;
}

const firstStepWithError = (errors: Errors) =>
  STEPS.findIndex((step) => step.fields.some((key) => errors[key]));

export function QuoteForm({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const { playTick } = useUiSounds();

  const [fields, setFields] = React.useState<Fields>(EMPTY);
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [attempted, setAttempted] = React.useState(false);
  const [shake, setShake] = React.useState(0);
  const [status, setStatus] = React.useState<SubmitState>("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const stepRef = React.useRef<HTMLDivElement>(null);
  const advanceTimer = React.useRef<number | null>(null);
  const started = React.useRef(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  const errors = validate(fields);
  const current = STEPS[step];
  const stepErrors = current.fields.filter((key) => errors[key]);
  const isLast = step === STEPS.length - 1;

  // Restore an unsent draft into the fields. The form always opens on the first step: resuming
  // mid-form made it look like it skipped the start.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Fields>;
      const methods = Array.isArray(parsed.methods)
        ? parsed.methods.filter((m): m is QuoteContact => QUOTE_CONTACTS.includes(m))
        : EMPTY.methods;
      const restored = { ...EMPTY, ...parsed, methods, company: "" };
      setFields(restored);
    } catch {
      // Storage can be blocked or hold bad data; start empty.
    }
  }, []);

  React.useEffect(() => {
    if (status === "sent") return;
    try {
      const { company, ...draft } = fields;
      void company;
      if (draft.details || draft.name || draft.email || draft.discord || draft.x || draft.service) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    } catch {
      // ignore
    }
  }, [fields, status]);

  React.useEffect(
    () => () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Move focus to the step's main control after it appears (skipped on first paint).
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = window.setTimeout(
      () => stepRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }),
      reduceMotion ? 0 : 280,
    );
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion]);

  const update = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    if (!started.current && key !== "company") {
      started.current = true;
      trackEvent("quote_started");
    }
    setFields((previous) => ({ ...previous, [key]: value }));
  };

  const go = React.useCallback((target: number) => {
    trackEvent("quote_step", { step: target + 1 });
    setDirection(target > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, target)));
    setAttempted(false);
  }, [step]);

  const send = async () => {
    setStatus("submitting");
    setServerError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service: fields.service,
          details: fields.details,
          budget: fields.budget,
          deadline: fields.deadline,
          name: fields.name,
          company: fields.company,
          ...(turnstileToken ? { turnstileToken } : {}),
          // Only the ways of replying that are switched on are sent.
          ...(fields.methods.includes("email") ? { email: fields.email.trim() } : {}),
          ...(fields.methods.includes("discord") ? { discord: cleanHandle(fields.discord) } : {}),
          ...(fields.methods.includes("x") ? { x: cleanHandle(fields.x) } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Could not send. Try the email instead.");
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      trackEvent("quote_sent");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Could not send. Try the email instead.");
    }
  };

  const advance = () => {
    if (status === "submitting") return;
    if (stepErrors.length) {
      setAttempted(true);
      setShake((count) => count + 1);
      stepRef.current
        ?.querySelector<HTMLElement>(`[data-field="${stepErrors[0]}"]`)
        ?.focus({ preventScroll: true });
      return;
    }
    if (!isLast) {
      go(step + 1);
      return;
    }
    if (isLast && turnstileConfigured && !turnstileToken) {
      setStatus("error");
      setServerError("Please complete the human check first.");
      return;
    }
    // Final step: make sure nothing earlier is still missing (e.g. a stale draft).
    const earlier = firstStepWithError(errors);
    if (earlier !== -1) {
      go(earlier);
      return;
    }
    void send();
  };

  const chooseService = (service: string) => {
    update("service", service);
    setAttempted(false);
    // Short pause so the selection animation reads before the step changes.
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => go(1), reduceMotion ? 0 : 420);
  };

  const reset = () => {
    setFields(EMPTY);
    setStep(0);
    setDirection(-1);
    setAttempted(false);
    setStatus("idle");
  };

  const shown = (key: FieldKey) => (attempted ? errors[key] : undefined);

  const slide = {
    enter: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 48, filter: reduceMotion ? "none" : "blur(6px)" }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -48, filter: reduceMotion ? "none" : "blur(6px)" }),
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.8, ease: EASE }}
      className={cn("relative border border-line/14 bg-void/30", className)}
    >
      <CornerMarks className="opacity-80" />

      <AnimatePresence mode="wait" initial={false}>
        {status === "sent" ? (
          <motion.div
            key="sent"
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="p-6 md:p-10"
          >
            <svg viewBox="0 0 52 52" className="size-14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <motion.circle
                cx="26"
                cy="26"
                r="23"
                className="text-line/30"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: EASE }}
              />
              <motion.path
                d="M15 27l8 8 14-17"
                className="text-ink"
                strokeLinecap="square"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.6, ease: EASE }}
              />
            </svg>
            <p className="mt-6 text-xs tracking-[0.22em] text-fog/72">RECEIVED</p>
            <h3 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
              Got it, {fields.name.trim().split(" ")[0]}.
            </h3>
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-fog/80">
              I’ll reply {replyChannels(fields)} within a day or two with questions or a price. If it’s
              urgent, email{" "}
              <a className="text-ink underline underline-offset-4" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
              .
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-8 text-[11px] tracking-[0.22em] text-fog/72 underline-offset-4 hover:text-ink hover:underline"
            >
              SEND ANOTHER
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            noValidate
            aria-label="Request a quote"
            onSubmit={(event) => {
              event.preventDefault();
              advance();
            }}
            className="p-6 md:p-10"
          >
            {/* Progress: four segments fill as you move through, with the step name beside the count. */}
            <div className="flex items-center justify-between text-[11px] tracking-[0.22em] text-fog/72">
              <span>
                <span className="text-ink tabular-nums">{String(step + 1).padStart(2, "0")}</span>
                <span className="tabular-nums"> / {String(STEPS.length).padStart(2, "0")}</span>
              </span>
              <span>{current.label}</span>
            </div>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {STEPS.map((item, index) => (
                <div key={item.label} className="h-px flex-1 bg-line/15">
                  <motion.div
                    className="h-full origin-left bg-ink"
                    initial={false}
                    animate={{ scaleX: index <= step ? 1 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}
                  />
                </div>
              ))}
            </div>

            <div className="relative mt-8 min-h-[25rem]" aria-live="polite">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  ref={stepRef}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduceMotion ? 0 : 0.38, ease: EASE }}
                >
                  <h3 className="font-serif text-3xl leading-[0.95] tracking-[-0.05em] md:text-4xl">
                    {current.title}
                  </h3>

                  {step === 0 ? (
                    <ServiceList
                      value={fields.service}
                      error={shown("service")}
                      shake={shake}
                      onChoose={chooseService}
                    />
                  ) : null}

                  {step === 1 ? (
                    <div className="mt-6">
                      <label htmlFor="quote-details" className="sr-only">
                        Project details
                      </label>
                      <textarea
                        id="quote-details"
                        data-field="details"
                        data-autofocus
                        value={fields.details}
                        maxLength={QUOTE_LIMITS.details.max}
                        onChange={(event) => update("details", event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            advance();
                          }
                        }}
                        aria-invalid={Boolean(shown("details"))}
                        aria-describedby="quote-details-hint"
                        placeholder="What are you building? What should the UI do, and what should it feel like?"
                        className={cn(FIELD, "mt-0 h-48 resize-none", shown("details") ? "border-red-300/60" : "border-line/14")}
                      />
                      <HintRow
                        id="quote-details-hint"
                        error={shown("details")}
                        shake={shake}
                        hint="Links to references or screenshots are welcome."
                        counter={`${fields.details.trim().length}/${QUOTE_LIMITS.details.max}`}
                      />
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="mt-8 space-y-10">
                      <BudgetSlider
                        value={fields.budget}
                        onChange={(budget) => {
                          playTick();
                          update("budget", budget);
                        }}
                      />
                      <StepSlider
                        label="TIMELINE"
                        options={QUOTE_DEADLINES}
                        value={fields.deadline}
                        onChange={(deadline) => {
                          playTick();
                          update("deadline", deadline);
                        }}
                      />
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="mt-6 grid gap-5">
                      <TextField
                        id="quote-name"
                        field="name"
                        label="NAME"
                        value={fields.name}
                        error={shown("name")}
                        shake={shake}
                        autoComplete="name"
                        placeholder="Your name"
                        maxLength={QUOTE_LIMITS.name.max}
                        autoFocus
                        onChange={(value) => update("name", value)}
                      />
                      <ContactPicker
                        fields={fields}
                        shown={shown}
                        shake={shake}
                        onToggle={(method) =>
                          setFields((previous) => ({
                            ...previous,
                            methods: previous.methods.includes(method)
                              ? previous.methods.filter((m) => m !== method)
                              : [...previous.methods, method],
                          }))
                        }
                        onChange={(method, value) => update(method, value)}
                      />
                      <TurnstileWidget onToken={setTurnstileToken} />
                      <p className="text-xs leading-relaxed text-fog/70">
                        I use these details only to reply to this request. A scrambled version of your
                        IP address is kept for a day or two to stop spam. See the{" "}
                        <Link href="/privacy" className="text-fog/80 underline underline-offset-4 hover:text-ink">
                          privacy note
                        </Link>
                        .
                      </p>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
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

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-line/10 pt-6">
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={step === 0 || status === "submitting"}
                className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] text-fog/72 transition-[color,opacity] hover:text-ink disabled:pointer-events-none disabled:opacity-0"
              >
                <span aria-hidden="true">←</span> BACK
              </button>

              <div className="flex items-center gap-4">
                {status === "error" ? (
                  <p className="text-xs text-red-200" role="alert">
                    {serverError}
                  </p>
                ) : null}
                {step === 0 && !fields.service ? null : (
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className={cn(
                      "quote-cta relative inline-flex items-center justify-center gap-3 border border-ink bg-ink px-6 py-3.5 text-xs font-medium tracking-[0.22em] text-void",
                      "disabled:cursor-wait disabled:opacity-70",
                    )}
                  >
                    <span>{status === "submitting" ? "SENDING…" : isLast ? "SEND REQUEST" : "CONTINUE"}</span>
                    <span aria-hidden="true" className="quote-cta-arrow">
                      →
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Large selectable rows: a fill sweeps across the chosen one, and the arrow slides in on hover. */
function ServiceList({
  value,
  error,
  shake,
  onChoose,
}: {
  value: string;
  error?: string;
  shake: number;
  onChoose: (service: string) => void;
}) {
  return (
    <div className="mt-6">
      <div role="radiogroup" aria-label="What do you need?" className="border-t border-line/12">
        {QUOTE_SERVICES.map((option, index) => {
          const selected = value === option;
          return (
            <motion.label
              key={option}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.08 + index * 0.06 }}
              className="group relative block cursor-pointer overflow-hidden border-b border-line/12"
            >
              <input
                type="radio"
                name="service"
                value={option}
                checked={selected}
                onChange={() => onChoose(option)}
                data-field={index === 0 ? "service" : undefined}
                data-autofocus={index === 0 ? "" : undefined}
                className="peer sr-only"
              />
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 origin-left bg-ink"
                initial={false}
                animate={{ scaleX: selected ? 1 : 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-left scale-x-0 bg-white/[0.04] transition-transform duration-500 ease-out group-hover:scale-x-100"
              />
              <span className="pointer-events-none absolute inset-0 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-ink/85" />
              <span className="relative flex items-center gap-4 px-4 py-3.5 md:gap-6">
                <span
                  className={cn(
                    "w-6 text-[11px] tabular-nums tracking-[0.22em] transition-colors duration-300",
                    selected ? "text-void/70" : "text-fog/70",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-serif text-xl leading-tight tracking-[-0.03em] transition-colors duration-300 md:text-2xl",
                      selected ? "text-void" : "text-ink",
                    )}
                  >
                    {option}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs transition-colors duration-300",
                      selected ? "text-void/70" : "text-fog/72",
                    )}
                  >
                    {QUOTE_SERVICE_HINTS[option]}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-lg transition-[transform,opacity,color] duration-300",
                    selected
                      ? "translate-x-0 text-void opacity-100"
                      : "-translate-x-2 text-fog opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                  )}
                >
                  {selected ? "✓" : "→"}
                </span>
              </span>
            </motion.label>
          );
        })}
      </div>
      <HintRow error={error} shake={shake} hint="Pick one. You can add more in the details." />
    </div>
  );
}

/**
 * Stepped slider. The native range input (invisible, full size) provides dragging, tapping and
 * keyboard control; the track, fill, thumb and value label are drawn on top and animate to it.
 */
function StepSlider({
  label,
  options,
  value,
  onChange,
  dimmed,
  onEngage,
  caption,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  dimmed?: boolean;
  onEngage?: () => void;
  caption?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const index = Math.max(0, options.indexOf(value));
  const percent = options.length > 1 ? (index / (options.length - 1)) * 100 : 0;
  const id = React.useId();

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        {caption}
      </div>

      <div className="mt-3 h-9 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={dimmed ? "unset" : value}
            initial={{ y: reduceMotion ? 0 : 28, opacity: 0 }}
            animate={{ y: 0, opacity: dimmed ? 0.45 : 1 }}
            exit={{ y: reduceMotion ? 0 : -28, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="font-serif text-3xl leading-none tracking-[-0.04em]"
          >
            {dimmed ? "—" : value}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative mt-5 h-8">
        <div aria-hidden="true" className="absolute inset-x-2 top-1/2 -translate-y-1/2">
          <div className="relative h-px bg-line/20">
            <motion.div
              className="absolute left-0 top-0 h-px bg-ink"
              initial={false}
              animate={{ width: `${percent}%`, opacity: dimmed ? 0.25 : 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 32 }}
            />
            {options.map((option, tick) => (
              <span
                key={option}
                className={cn(
                  "absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300",
                  tick <= index && !dimmed ? "bg-ink" : "bg-line/30",
                )}
                style={{ left: `${(tick / (options.length - 1)) * 100}%` }}
              />
            ))}
            <motion.span
              className={cn(
                "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink shadow-[0_0_0_6px_rgb(255_255_255/0.08)] transition-opacity duration-300",
                dimmed && "opacity-40",
              )}
              initial={false}
              animate={{ left: `${percent}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            />
          </div>
        </div>

        <input
          id={id}
          type="range"
          min={0}
          max={options.length - 1}
          step={1}
          value={index}
          data-autofocus={label === "BUDGET" ? "" : undefined}
          onChange={(event) => onChange(options[Number(event.target.value)])}
          onPointerDown={onEngage}
          onKeyDown={onEngage}
          aria-valuetext={dimmed ? "Not set" : value}
          className="peer absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span className="pointer-events-none absolute inset-0 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink/85" />
      </div>

      <div className="mt-1 flex justify-between text-[11px] tracking-[0.18em] text-fog/70" aria-hidden="true">
        <span>{options[0].toUpperCase()}</span>
        <span>{options[options.length - 1].toUpperCase()}</span>
      </div>
    </div>
  );
}

/** Budget slider plus a "not sure" switch; moving the slider turns the switch off. */
function BudgetSlider({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const unsure = value === QUOTE_BUDGET_UNSURE;

  return (
    <StepSlider
      label="BUDGET"
      options={QUOTE_BUDGET_STEPS}
      value={unsure ? QUOTE_BUDGET_STEPS[1] : value}
      dimmed={unsure}
      onChange={onChange}
      onEngage={() => unsure && onChange(QUOTE_BUDGET_STEPS[1])}
      caption={
        <label className="flex cursor-pointer items-center gap-2 text-[11px] tracking-[0.22em] text-fog/72 hover:text-ink">
          <input
            type="checkbox"
            checked={unsure}
            onChange={(event) => onChange(event.target.checked ? QUOTE_BUDGET_UNSURE : QUOTE_BUDGET_STEPS[1])}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="grid size-3.5 place-items-center border border-line/40 transition-colors peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink/85"
          >
            <span className={cn("size-1.5 bg-void transition-opacity", unsure ? "opacity-100" : "opacity-0")} />
          </span>
          NOT SURE YET
        </label>
      }
    />
  );
}

function HintRow({
  id,
  error,
  hint,
  counter,
  shake,
}: {
  id?: string;
  error?: string;
  hint: string;
  counter?: string;
  shake: number;
}) {
  return (
    <div className="mt-2 flex items-start justify-between gap-4 text-xs">
      <motion.p
        key={error ? `error-${shake}` : "hint"}
        id={id}
        role={error ? "alert" : undefined}
        initial={error ? { x: -6 } : false}
        animate={{ x: error ? [-6, 6, -4, 4, 0] : 0 }}
        transition={{ duration: 0.4 }}
        className={error ? "text-red-200" : "text-fog/70"}
      >
        {error ?? hint}
      </motion.p>
      {counter ? <span className="shrink-0 tabular-nums text-fog/70">{counter}</span> : null}
    </div>
  );
}

function TextField({
  id,
  field,
  label,
  value,
  error,
  shake,
  type = "text",
  autoComplete,
  placeholder,
  maxLength,
  autoFocus,
  onChange,
}: {
  id: string;
  field: string;
  label: string;
  value: string;
  error?: string;
  shake: number;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        data-field={field}
        data-autofocus={autoFocus ? "" : undefined}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(FIELD, error ? "border-red-300/60" : "border-line/14")}
      />
      {error ? (
        <motion.p
          key={shake}
          id={`${id}-error`}
          role="alert"
          initial={{ x: -6 }}
          animate={{ x: [-6, 6, -4, 4, 0] }}
          transition={{ duration: 0.4 }}
          className="mt-1.5 text-xs text-red-200"
        >
          {error}
        </motion.p>
      ) : null}
    </div>
  );
}

/** "by email (a@b.com), on Discord (name) and on X (@handle)" for the confirmation message. */
function replyChannels(fields: Fields) {
  const parts = fields.methods.map((method) => {
    if (method === "email") return `by email (${fields.email.trim()})`;
    if (method === "discord") return `on Discord (${cleanHandle(fields.discord)})`;
    return `on X (@${cleanHandle(fields.x)})`;
  });
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Pick any mix of email, Discord and X. Each one you switch on opens its own input. */
function ContactPicker({
  fields,
  shown,
  shake,
  onToggle,
  onChange,
}: {
  fields: Fields;
  shown: (key: FieldKey) => string | undefined;
  shake: number;
  onToggle: (method: QuoteContact) => void;
  onChange: (method: QuoteContact, value: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const groupError = shown("contact");

  const toggle = (method: QuoteContact) => {
    const turningOn = !fields.methods.includes(method);
    onToggle(method);
    if (turningOn) {
      window.setTimeout(() => document.getElementById(`quote-${method}`)?.focus({ preventScroll: true }), 80);
    }
  };

  return (
    <fieldset>
      <legend className={LABEL}>HOW SHOULD I REPLY? (PICK ANY)</legend>
      <div className="mt-3 border-t border-line/12">
        {QUOTE_CONTACTS.map((method, index) => {
          const selected = fields.methods.includes(method);
          const info = QUOTE_CONTACT_INFO[method];
          const error = shown(method);
          return (
            <div key={method} className="border-b border-line/12">
              <label className="group relative flex cursor-pointer items-center gap-4 overflow-hidden px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(method)}
                  data-field={index === 0 ? "contact" : undefined}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 origin-left scale-x-0 bg-white/[0.04] transition-transform duration-500 ease-out group-hover:scale-x-100"
                />
                <span className="pointer-events-none absolute inset-0 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-ink/85" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative grid size-5 shrink-0 place-items-center border transition-colors duration-300",
                    selected ? "border-ink bg-ink" : "border-line/40",
                  )}
                >
                  <svg viewBox="0 0 16 16" className="size-3 text-void" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <motion.path
                      d="M3 8.5l3.2 3.2L13 4.8"
                      strokeLinecap="square"
                      initial={false}
                      animate={{ pathLength: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
                    />
                  </svg>
                </span>
                <span className="relative flex-1 font-serif text-xl leading-tight tracking-[-0.03em] md:text-2xl">
                  {info.label}
                </span>
                <span className="relative hidden text-xs text-fog/72 sm:block">{info.hint}</span>
              </label>

              <AnimatePresence initial={false}>
                {selected ? (
                  <motion.div
                    key="input"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.35, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pl-[3.25rem]">
                      <input
                        id={`quote-${method}`}
                        data-field={method}
                        type={method === "email" ? "email" : "text"}
                        value={fields[method]}
                        maxLength={method === "email" ? 160 : 64}
                        autoComplete={method === "email" ? "email" : "off"}
                        placeholder={info.placeholder}
                        aria-label={`${info.label} to reply to`}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `quote-${method}-error` : undefined}
                        onChange={(event) => onChange(method, event.target.value)}
                        className={cn(FIELD, "mt-0", error ? "border-red-300/60" : "border-line/14")}
                      />
                      {error ? (
                        <motion.p
                          key={shake}
                          id={`quote-${method}-error`}
                          role="alert"
                          initial={{ x: -6 }}
                          animate={{ x: [-6, 6, -4, 4, 0] }}
                          transition={{ duration: 0.4 }}
                          className="mt-1.5 text-xs text-red-200"
                        >
                          {error}
                        </motion.p>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <HintRow
        error={groupError}
        shake={shake}
        hint="Pick one or more. Turn on as many as you like."
      />
    </fieldset>
  );
}
