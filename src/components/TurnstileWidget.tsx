"use client";

import * as React from "react";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: "dark";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** True when a Turnstile site key is configured; the form then requires the check. */
export const turnstileConfigured = Boolean(SITE_KEY);

function loadScript(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject()));
    script.addEventListener("error", () => reject());
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/** Cloudflare Turnstile checkbox. Renders nothing when no site key is configured. */
export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let widgetId: string | null = null;
    let cancelled = false;

    loadScript()
      .then((api) => {
        if (cancelled || !ref.current) return;
        widgetId = api.render(ref.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
