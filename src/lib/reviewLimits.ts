/** Limits for review submissions, shared by the form and the API so they cannot drift. */
export const REVIEW_LIMITS = {
  name: { min: 2, max: 64 },
  text: { min: 8, max: 420 },
  reply: { min: 2, max: 600 },
} as const;

export const REVIEW_ATTACHMENTS = {
  max: 4,
  /** Hard limit per file, checked in the browser and again on the server. */
  maxBytes: 5 * 1024 * 1024,
  /** Largest request the hosting platform accepts is about 4.5MB, so bigger images are shrunk first. */
  uploadBytes: Math.floor(4.2 * 1024 * 1024),
  types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  accept: "image/jpeg,image/png,image/webp,image/gif",
} as const;

/** Replies per review, and how many of a reviewer's replies may wait for approval at once. */
export const THREAD_LIMITS = { replies: 40, pendingClientReplies: 3 } as const;

/** Stored attachment names: a random UUID plus the extension of the re-encoded file. */
export const ATTACHMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
