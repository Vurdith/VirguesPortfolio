import { notFound } from "next/navigation";

import { mockWorks } from "@/content/mockWorks";
import { WorkViewer } from "@/components/work/WorkViewer";
import { getPublicWorks } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const works = await getPublicWorks();
  const pool = works.length ? works : mockWorks;
  const work = pool.find((w) => w.slug === slug && w.published);
  if (!work) notFound();

  return <WorkViewer work={work} />;
}


