import type { MetadataRoute } from "next";

import { getPublicWorks } from "@/lib/db";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: SITE.url, changeFrequency: "monthly", priority: 1 }];

  try {
    const works = await getPublicWorks();
    for (const w of works) {
      if (!w.published) continue;
      entries.push({ url: `${SITE.url}/work/${w.slug}`, changeFrequency: "monthly", priority: 0.7 });
    }
  } catch {
    // Fall back to the home page if the database is unreachable.
  }

  return entries;
}
