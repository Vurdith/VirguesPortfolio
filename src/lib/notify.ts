import { SITE } from "@/lib/site";

/**
 * Emails the site owner through Resend when `RESEND_API_KEY` is set. It never throws: a missing key
 * or a failed send must not lose the submission, which is already stored.
 */
export async function notifyOwner(subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || "Virguê <onboarding@resend.dev>",
        to: [process.env.NOTIFY_TO_EMAIL || SITE.email],
        subject,
        text,
      }),
    });
    if (!res.ok) console.error("Notification email failed:", res.status);
  } catch (err) {
    console.error("Notification email failed:", err);
  }
}
