import type { BrandName } from "@/components/BrandLogo";

const PAYPAL_EMAIL = "reeceleneveubusiness@gmail.com";

/** The three ways to pay, shared by the payment section and the chat. */
export const PAYMENT_METHODS = [
  {
    title: "Stripe",
    logo: "stripe",
    description:
      "Fast encrypted checkout for cards and supported wallets. Confirmation is handled immediately after payment.",
    cta: "Pay with Stripe",
    href: "https://buy.stripe.com/6oUaEZ9geg0p0Qm3X7aMU00",
  },
  {
    title: "PayPal",
    logo: "paypal",
    description: "Prefer PayPal? Pay through PayPal once the project scope and quote are confirmed.",
    cta: "Pay with PayPal",
    href: `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_EMAIL)}&item_name=${encodeURIComponent("Virgue project payment")}&currency_code=GBP`,
  },
  {
    title: "Wise",
    logo: "wise",
    description:
      "Pay in your own currency with a low-fee Wise transfer once the project scope and quote are confirmed.",
    cta: "Pay with Wise",
    href: "https://wise.com/pay/me/reeceluisl",
  },
] as const satisfies readonly { title: string; logo: BrandName; description: string; cta: string; href: string }[];

/** Robux for one pound: 15,000 Robux buys the £30 task. */
export const ROBUX_PER_POUND = 500;

export const robux = (pounds: number) => `R$${Math.round(pounds * ROBUX_PER_POUND).toLocaleString("en-GB")}`;

/** Rewrites every "£12.50" in a label as its price in Robux. */
export const inRobux = (text: string) => text.replace(/£\s?(\d+(?:\.\d+)?)/g, (_, amount: string) => robux(Number(amount)));
