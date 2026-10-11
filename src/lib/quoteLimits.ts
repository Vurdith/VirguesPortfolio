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
