/** Options and length limits for quote requests, shared by the form, the API and the admin. */
export const QUOTE_LIMITS = {
  name: { min: 2, max: 80 },
  details: { min: 20, max: 1500 },
  deadline: { max: 80 },
} as const;

export const QUOTE_SERVICES = [
  "Game UI",
  "Website / app UI",
  "Asset import & setup",
  "Polish & motion",
  "Something else",
] as const;

/** One-line explanation shown under each service in the form. */
export const QUOTE_SERVICE_HINTS: Record<(typeof QUOTE_SERVICES)[number], string> = {
  "Game UI": "HUDs, menus, inventories, full interface systems",
  "Website / app UI": "Landing pages, dashboards, product interfaces",
  "Asset import & setup": "Get finished art working properly in your engine",
  "Polish & motion": "Make an existing interface feel better to use",
  "Something else": "Describe it in the next step",
};

/** The slider stops, lowest to highest. "Not sure yet" is a separate toggle in the form. */
export const QUOTE_BUDGET_STEPS = ["Under £100", "£100 – £300", "£300 – £1000", "£1000+"] as const;
export const QUOTE_BUDGET_UNSURE = "Not sure yet";
export const QUOTE_BUDGETS = [...QUOTE_BUDGET_STEPS, QUOTE_BUDGET_UNSURE] as const;

/** Timeline stops, soonest to most relaxed. */
export const QUOTE_DEADLINES = ["ASAP", "Within a month", "1–3 months", "Flexible"] as const;

/** Ways a visitor can ask to be contacted. They can pick any combination. */
export const QUOTE_CONTACTS = ["email", "discord", "x"] as const;
export type QuoteContact = (typeof QUOTE_CONTACTS)[number];

export const QUOTE_CONTACT_INFO: Record<
  QuoteContact,
  { label: string; hint: string; placeholder: string; invalid: string }
> = {
  email: { label: "Email", hint: "Replies in your inbox", placeholder: "you@studio.com", invalid: "Add a valid email address." },
  discord: { label: "Discord", hint: "I’ll send you a message", placeholder: "username", invalid: "Add your Discord username." },
  x: { label: "X", hint: "I’ll reply by DM", placeholder: "@handle", invalid: "Add your X handle (letters, numbers, underscores)." },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISCORD_PATTERN = /^@?[A-Za-z0-9_.#]{2,40}$/;
const X_PATTERN = /^@?[A-Za-z0-9_]{1,15}$/;

/** True when `value` is acceptable for that contact method (used by the form and the API). */
export function isValidContact(method: QuoteContact, value: string): boolean {
  const trimmed = value.trim();
  if (method === "email") return trimmed.length <= 160 && EMAIL_PATTERN.test(trimmed);
  if (method === "discord") return DISCORD_PATTERN.test(trimmed);
  return X_PATTERN.test(trimmed);
}

/** Stored form of a handle: no leading @. */
export const cleanHandle = (value: string) => value.trim().replace(/^@/, "");
