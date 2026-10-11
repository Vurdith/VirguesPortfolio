"use client";

import * as React from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      tabIndex={-1}
      className="film-grain vignette min-h-dvh px-6 py-16 outline-none md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-xs tracking-[0.22em] text-fog/70">ERROR</p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.92] tracking-[-0.06em] md:text-6xl">
          Frame dropped.
        </h1>
        <p className="mt-6 max-w-prose text-pretty text-sm leading-relaxed text-fog/80 md:text-base">
          Something broke while loading this page. It’s not you. Try again, or head back home.
        </p>
        {error.digest ? (
          <p className="mt-4 text-[11px] tracking-[0.22em] text-fog/70">REF {error.digest}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-3 border border-line/20 bg-ink px-5 py-3 text-xs tracking-[0.22em] text-void"
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-3 border border-line/18 bg-void/30 px-5 py-3 text-xs tracking-[0.22em] text-ink hover:border-line/35"
          >
            <span>RETURN HOME</span>
            <span className="h-px w-10 bg-line/15" />
            <span className="text-fog/70">↩</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
