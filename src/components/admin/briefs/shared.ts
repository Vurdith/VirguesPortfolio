import type { AdminBrief } from "@/lib/chat/admin";

export type Filter = "all" | "live" | "new" | "replied" | "closed" | "unfinished";

export const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "new", label: "New" },
  { key: "replied", label: "Replied" },
  { key: "closed", label: "Closed" },
  { key: "unfinished", label: "Unfinished" },
];

export function matches(brief: AdminBrief, filter: Filter) {
  switch (filter) {
    case "all":
      return true;
    case "live":
      return brief.status === "open";
    case "unfinished":
      return brief.status === "abandoned";
    default:
      return brief.status === "resolved" && brief.handled === filter;
  }
}

export const money = (value: number) => `£${value.toLocaleString("en-GB")}`;

export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** "now", "5m", "3h", "2d", then the date. */
export function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 45) return "now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.round(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The reply link for whatever contact the customer gave, when it can be turned into one. */
export function contactLink(contact: string) {
  const email = contact.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/)?.[0];
  return email ? `mailto:${email}?subject=${encodeURIComponent("Your design brief")}` : null;
}

export const unitPrice = (brief: AdminBrief) => (brief.brief.styleReplication ? brief.styleOffer : brief.offer);
export const total = (brief: AdminBrief) => (brief.brief.frames ? brief.brief.frames * unitPrice(brief) : null);

export const preview = (brief: AdminBrief) => {
  const last = brief.messages.at(-1);
  if (!last) return "No messages yet";
  const text = last.content.replace(/\s+/g, " ").trim() || (last.images.length ? "Sent an image" : "");
  return `${last.role === "user" ? "" : last.owner ? "You: " : "AI: "}${text}`;
};

/** Where the conversation stands, in a word. */
export function stateOf(brief: AdminBrief): { label: string; tone: "live" | "you" | "new" | "quiet" } {
  if (brief.status === "open") return brief.takeover ? { label: "You", tone: "you" } : { label: "Live", tone: "live" };
  if (brief.status === "abandoned") return { label: "Unfinished", tone: "quiet" };
  return brief.handled === "new" ? { label: "New", tone: "new" } : { label: brief.handled === "replied" ? "Replied" : "Closed", tone: "quiet" };
}

/** The part of a contact worth pasting: "Discord: gyroac" becomes "gyroac". */
export const contactHandle = (contact: string) =>
  contact.replace(/^\s*(?:discord|x|twitter|telegram|instagram|email|e-mail)\s*[:\-–]\s*/i, "").trim();

/** Copies text to the clipboard. False when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const done = document.execCommand("copy");
      field.remove();
      return done;
    } catch {
      return false;
    }
  }
}
