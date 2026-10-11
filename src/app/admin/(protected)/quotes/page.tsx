import { QuotesTable } from "@/components/admin/quotes/QuotesTable";
import { publicQuote, readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  const db = await readDb();
  const fresh = db.quotes.filter((q) => q.status === "new").length;

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs tracking-[0.22em] text-fog/70">QUOTES</p>
          <h1 className="mt-3 font-serif text-4xl leading-[0.95] tracking-[-0.05em] md:text-5xl">
            Requests.
          </h1>
        </div>
        <div className="inline-flex items-center gap-3 border border-line/12 bg-void/35 px-3 py-2 text-[11px] tracking-[0.22em] text-fog/70">
          <span>NEW</span>
          <span className="h-px w-6 bg-line/10" />
          <span className="text-ink/85">{fresh}</span>
        </div>
      </div>

      <div className="mt-10">
        <QuotesTable initialQuotes={db.quotes.map(publicQuote)} />
      </div>
    </div>
  );
}
