import Link from "next/link";

export default function NotFound() {
  return (
    <main className="film-grain vignette min-h-dvh px-6 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs tracking-[0.22em] text-fog/70">404</p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.92] tracking-[-0.06em] md:text-6xl">
          Missing frame.
        </h1>
        <p className="mt-6 max-w-prose text-pretty text-sm leading-relaxed text-fog/80 md:text-base">
          The page doesn’t exist — or it was cut in the edit.
        </p>

        <div className="mt-10">
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



