import { SITE } from "@/lib/site";

type Email = { to: string; subject: string; text: string; replyTo?: string };

/**
 * Sends one email through Resend when `RESEND_API_KEY` is set. It never throws: a missing key or a
 * failed send must not lose a submission, which is already stored.
 */
async function sendEmail({ to, subject, text, replyTo }: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || "Virguê <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) console.error("Email failed:", res.status);
  } catch (err) {
    console.error("Email failed:", err);
  }
}

/** Emails the site owner. */
export function notifyOwner(subject: string, text: string) {
  return sendEmail({ to: process.env.NOTIFY_TO_EMAIL || SITE.email, subject, text });
}

/**
 * Confirms a quote request to the visitor. Off unless `QUOTE_AUTOREPLY=1`, because it only works
 * once a sending domain is verified in Resend (the default sandbox sender can only email you).
 */
export function autoReplyToVisitor(to: string, name: string) {
  if (process.env.QUOTE_AUTOREPLY !== "1") return Promise.resolve();
  return sendEmail({
    to,
    subject: "Got your quote request",
    replyTo: SITE.email,
    text: [
      `Hi ${name.split(" ")[0] || "there"},`,
      "",
      "Thanks for the details. I've got your request and will reply within a day or two with questions or a price.",
      "",
      `If anything changes, just reply to this email or write to ${SITE.email}.`,
      "",
      SITE.name,
    ].join("\n"),
  });
}
