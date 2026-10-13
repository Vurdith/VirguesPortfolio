import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { WorkViewer } from "@/components/work/WorkViewer";
import { getPublicWorks } from "@/lib/db";
import { SITE } from "@/lib/site";
import { workPieces } from "@/lib/work";

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

  // A link to a piece of work shows that work: its first image, or the site's picture when it has none.
  const cover = workPieces(work).find((piece) => piece.kind === "image" && piece.src)?.src ?? "/og.jpg";

  return {
    title: work.title,
    description,
    alternates: { canonical: `/work/${work.slug}` },
    openGraph: {
      type: "article",
      url: `${SITE.url}/work/${work.slug}`,
      siteName: SITE.name,
      title: `${work.title} — ${SITE.name}`,
      description,
      images: [{ url: cover, alt: work.title }],
    },
    twitter: { card: "summary_large_image", title: `${work.title} — ${SITE.name}`, description, images: [cover] },
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

  const images = workPieces(work)
    .filter((piece) => piece.kind === "image" && piece.src)
    .map((piece) => (piece.src.startsWith("http") ? piece.src : `${SITE.url}${piece.src}`));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: work.title,
          description: work.summary || undefined,
          url: `${SITE.url}/work/${work.slug}`,
          image: images.length > 1 ? images : images[0],
          dateCreated: work.year ? String(work.year) : undefined,
          keywords: work.tags.join(", ") || undefined,
          creator: { "@type": "Person", name: SITE.name, url: SITE.url },
        }}
      />
      <WorkViewer work={work} />
    </>
  );
}
