import { track } from "@vercel/analytics";

/** Records a custom event. Safe to call anywhere: analytics must never break the page. */
export function trackEvent(name: string, data?: Record<string, string | number>) {
  try {
    track(name, data);
  } catch {
    // Blocked by an ad blocker or not available in development.
  }
}
