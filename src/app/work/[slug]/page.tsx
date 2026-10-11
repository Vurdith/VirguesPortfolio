import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { WorkViewer } from "@/components/work/WorkViewer";
import { getPublicWorks } from "@/lib/db";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

async function findWork(slug: string) {
  const works = await getPublicWorks();
  return works.find((work) => work.slug === slug && work.published);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = await findWork(slug);
  if (!work) return { title: "Not found" };

  const description =
    work.summary || `${work.title}: UI design and development by ${SITE.name}.`;

  return {
    title: work.title,
    description,
    alternates: { canonical: `/work/${work.slug}` },
    openGraph: {
      type: "article",
      url: `${SITE.url}/work/${work.slug}`,
      title: `${work.title} — ${SITE.name}`,
      description,
    },
    twitter: { card: "summary_large_image", title: `${work.title} — ${SITE.name}`, description },
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = await findWork(slug);
  if (!work) notFound();

  const mediaUrl = work.media.src.startsWith("http") ? work.media.src : `${SITE.url}${work.media.src}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: work.title,
          description: work.summary || undefined,
          url: `${SITE.url}/work/${work.slug}`,
          image: work.media.kind === "image" && work.media.src ? mediaUrl : undefined,
          dateCreated: work.year ? String(work.year) : undefined,
          keywords: work.tags.join(", ") || undefined,
          creator: { "@type": "Person", name: SITE.name, url: SITE.url },
        }}
      />
      <WorkViewer work={work} />
    </>
  );
}
