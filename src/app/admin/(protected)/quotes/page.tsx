import { PageHeader } from "@/components/admin/ui";
import { QuotesTable } from "@/components/admin/quotes/QuotesTable";
import { publicQuote, readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage() {
  const db = await readDb();

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader title="Quotes" />
      <div className="mt-10">
        <QuotesTable initialQuotes={db.quotes.map(publicQuote)} />
      </div>
    </div>
  );
}
