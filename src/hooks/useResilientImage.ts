"use client";

import * as React from "react";

/**
 * The image URL to show for `primary`, with a way out when it fails. Card artwork is a CSS
 * background, which never retries: one failed request leaves the card blank. This watches the
 * request, switches to `fallback` (the original file) if the first URL errors, and tries once more
 * after a pause if that fails too.
 */
export function useResilientImage(primary: string, fallback = "") {
  const [src, setSrc] = React.useState(primary);

  React.useEffect(() => {
    setSrc(primary);
    if (!primary) return;

    let cancelled = false;
    let timer = 0;

    const probe = (url: string, retried: boolean) => {
      const image = new Image();
      image.onerror = () => {
        if (cancelled) return;
        if (url === primary && fallback && fallback !== primary) {
          setSrc(fallback);
          probe(fallback, false);
        } else if (!retried) {
          timer = window.setTimeout(() => !cancelled && probe(url, true), 2000);
        }
      };
      image.src = url;
    };
    probe(primary, false);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [primary, fallback]);

  return src;
}
