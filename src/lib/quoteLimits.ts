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

export const QUOTE_BUDGETS = [
  "Under £100",
  "£100 – £300",
  "£300 – £1000",
  "£1000+",
  "Not sure yet",
] as const;
