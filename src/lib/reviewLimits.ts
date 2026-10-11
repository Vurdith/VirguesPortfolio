/** Length limits for review submissions, shared by the form and the API so they cannot drift. */
export const REVIEW_LIMITS = {
  name: { min: 2, max: 64 },
  text: { min: 8, max: 420 },
} as const;
