import Link from "next/link";

import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { AdminCard, CountNumber, PageHeader, Reveal, adminButton } from "@/components/admin/ui";
import { readDb } from "@/lib/db";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function AdminDashboardPage() {
  const db = await readDb();
  const quotesNew = db.quotes.filter((q) => q.status === "new");
  const reviewsPending = db.reviews.filter((r) => r.status === "pending");
  const reviewsApproved = db.reviews.filter((r) => r.status === "approved").length;
  const published = db.works.filter((w) => w.published).length;
  const latestWorks = [...db.works].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  const stats = [
    { label: "WORKS", value: db.works.length, note: `${published} PUBLISHED`, href: "/admin/works", hot: false },
    { label: "NEW QUOTES", value: quotesNew.length, note: `${db.quotes.length} TOTAL`, href: "/admin/quotes", hot: quotesNew.length > 0 },
    { label: "PENDING REVIEWS", value: reviewsPending.length, note: `${reviewsApproved} APPROVED`, href: "/admin/reviews", hot: reviewsPending.length > 0 },
    { label: "REVIEWS", value: db.reviews.length, note: "ALL TIME", href: "/admin/reviews", hot: false },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader eyebrow="DASHBOARD" title="Control room.">
        <Link href="/admin/works/new" className={adminButton}>
          + NEW WORK
        </Link>
      </PageHeader>

      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.06}>
            <Link href={stat.href} className="block h-full">
              <AdminCard interactive className="h-full p-5 md:p-6">
                <div className="flex items-center justify-between text-[11px] tracking-[0.22em] text-fog/70">
                  <span>{stat.label}</span>
                  {stat.hot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" /> : null}
                </div>
                <div className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] md:text-5xl">
                  <CountNumber value={stat.value} />
                </div>
                <div className="mt-4 h-px w-full bg-line/10" />
                <div className="mt-3 text-[11px] tracking-[0.22em] text-fog/60">{stat.note}</div>
              </AdminCard>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05}>
          <Panel title="Needs attention" href="/admin/quotes">
            {quotesNew.length || reviewsPending.length ? (
              <ul className="divide-y divide-line/10">
                {quotesNew.slice(0, 3).map((quote) => (
                  <Row key={quote.id} href="/admin/quotes" tag="QUOTE" title={quote.name} meta={shortDate(quote.createdAt)} sub={quote.service} />
                ))}
                {reviewsPending.slice(0, 3).map((review) => (
                  <Row key={review.id} href="/admin/reviews" tag="REVIEW" title={review.name} meta={shortDate(review.createdAt)} sub={`${"★".repeat(review.rating)} ${review.text}`} />
                ))}
              </ul>
            ) : (
              <Empty>You&apos;re all caught up.</Empty>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.1}>
          <Panel title="Recently edited" href="/admin/works">
            {latestWorks.length ? (
              <ul className="divide-y divide-line/10">
                {latestWorks.map((work) => (
                  <Row
                    key={work.id}
                    href={`/admin/works/${work.id}/edit`}
                    tag={work.published ? "LIVE" : "DRAFT"}
                    title={work.title}
                    meta={shortDate(work.updatedAt)}
                  />
                ))}
              </ul>
            ) : (
              <Empty>No work entries yet.</Empty>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.15}>
          <Panel title="Security">
            <ChangePasswordForm />
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <AdminCard className="h-full p-5 md:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.28em] text-fog/70">{title.toUpperCase()}</p>
        {href ? (
          <Link href={href} className="text-[11px] tracking-[0.22em] text-fog/60 transition-colors hover:text-ink">
            OPEN →
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </AdminCard>
  );
}

function Row({ href, tag, title, meta, sub }: { href: string; tag: string; title: string; meta: string; sub?: string }) {
  return (
    <li>
      <Link href={href} className="-mx-2 flex items-start gap-3 px-2 py-3 transition-colors hover:bg-white/[0.03]">
        <span
          className={cn(
            "mt-0.5 shrink-0 border px-1.5 py-0.5 text-[10px] tracking-[0.2em]",
            tag === "DRAFT" ? "border-line/12 text-fog/55" : "border-line/30 text-ink/85",
          )}
        >
          {tag}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-base leading-tight tracking-[-0.02em]">{title}</span>
          {sub ? <span className="mt-1 block truncate text-xs text-fog/60">{sub}</span> : null}
        </span>
        <span className="shrink-0 text-[11px] tracking-[0.18em] text-fog/55">{meta}</span>
      </Link>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm text-fog/60">{children}</p>;
}
