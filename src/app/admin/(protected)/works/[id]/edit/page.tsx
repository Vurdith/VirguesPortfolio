import { notFound } from "next/navigation";

import { WorkForm } from "@/components/admin/works/WorkForm";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminEditWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDb();
  const work = db.works.find((w) => w.id === id);
  if (!work) notFound();

  return <WorkForm mode="edit" work={work} />;
}



