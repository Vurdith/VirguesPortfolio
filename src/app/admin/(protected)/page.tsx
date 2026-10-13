import Link from "next/link";

import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { AdminCard, CountNumber, PageHeader, Reveal, adminButtonSolid } from "@/components/admin/ui";
import { listThreads } from "@/lib/chat/store";
import { readDb } from "@/lib/db";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function AdminDashboardPage() {
  const [db, threads] = await Promise.all([readDb(), listThreads().catch(() => [])]);
  const quotesNew = db.quotes.filter((q) => q.status === "new");
  const reviewsPending = db.reviews.filter((r) => r.status === "pending");
  const briefsWaiting = threads.filter((t) => t.status === "open" || (t.status === "resolved" && t.handled === "new"));
  const briefsLive = threads.filter((t) => t.status === "open").length;
  const published = db.works.filter((w) => w.published).length;
  const latestWorks = [...db.works].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  const stats = [
    { label: "Briefs", value: briefsWaiting.length, note: briefsLive ? `${briefsLive} live now` : `${threads.length} total`, href: "/admin/briefs", hot: briefsWaiting.length > 0 },
    { label: "New quotes", value: quotesNew.length, note: `${db.quotes.length} total`, href: "/admin/quotes", hot: quotesNew.length > 0 },
    { label: "Reviews to approve", value: reviewsPending.length, note: `${db.reviews.length} total`, href: "/admin/reviews", hot: reviewsPending.length > 0 },
    { label: "Works", value: db.works.length, note: `${published} published`, href: "/admin/works", hot: false },
  ];

  const attention = [
    ...briefsWaiting.slice(0, 3).map((thread) => ({
      key: thread.id,
      href: `/admin/briefs/${thread.id}`,
      tag: "Brief",
      title: thread.brief.name || "Unnamed visitor",
      meta: shortDate(thread.updatedAt),
      sub: thread.brief.project || thread.brief.contact,
    })),
    ...quotesNew.slice(0, 3).map((quote) => ({ key: quote.id, href: "/admin/quotes", tag: "Quote", title: quote.name, meta: shortDate(quote.createdAt), sub: quote.service })),
    ...reviewsPending.slice(0, 3).map((review) => ({
      key: review.id,
      href: "/admin/reviews",
      tag: "Review",
      title: review.name,
      meta: shortDate(review.createdAt),
      sub: `${"★".repeat(review.rating)} ${review.text}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
      <PageHeader title="Dashboard">
        <Link href="/admin/works/new" className={adminButtonSolid}>
          + New work
        </Link>
      </PageHeader>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 0.06}>
            <Link href={stat.href} className="block h-full">
              <AdminCard interactive className="h-full p-5 md:p-6">
                <div className="flex items-center justify-between text-sm text-fog/70">
                  <span>{stat.label}</span>
                  {stat.hot ? <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-ink" /> : null}
                </div>
                <div className="mt-4 font-serif text-5xl leading-none tracking-[-0.05em]">
                  <CountNumber value={stat.value} />
                </div>
                <div className="mt-4 text-xs text-fog/55">{stat.note}</div>
              </AdminCard>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05} className="lg:col-span-2">
          <Panel title="Needs your attention">
            {attention.length ? (
              <ul className="divide-y divide-line/10">
                {attention.map((item) => (
                  <Row key={item.key} href={item.href} tag={item.tag} title={item.title} meta={item.meta} sub={item.sub} />
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
                  <Row key={work.id} href={`/admin/works/${work.id}/edit`} tag={work.published ? undefined : "Draft"} title={work.title} meta={shortDate(work.updatedAt)} />
                ))}
              </ul>
            ) : (
              <Empty>No work entries yet.</Empty>
            )}
          </Panel>
        </Reveal>
      </div>

      <Reveal delay={0.15} className="mt-4">
        <Panel title="Change password">
          <ChangePasswordForm />
        </Panel>
      </Reveal>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <AdminCard className="h-full p-5 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-fog/75">{title}</h2>
        {href ? (
          <Link href={href} className="text-xs text-fog/55 transition-colors hover:text-ink">
            Open →
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </AdminCard>
  );
}

function Row({ href, tag, title, meta, sub }: { href: string; tag?: string; title: string; meta: string; sub?: string }) {
  return (
    <li>
      <Link href={href} className="-mx-3 flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]">
        {tag ? <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px]", tag === "Draft" ? "border-line/10 text-fog/55" : "border-line/30 text-ink/90")}>{tag}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-base leading-tight tracking-[-0.02em]">{title}</span>
          {sub ? <span className="mt-1 block truncate text-xs text-fog/55">{sub}</span> : null}
        </span>
        <span className="shrink-0 text-xs text-fog/50">{meta}</span>
      </Link>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm text-fog/60">{children}</p>;
}
