import type { MetadataRoute } from "next";
import { getDirectorySafely, categoriesOf } from "@/lib/directory";

export const revalidate = 3600;

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://passdari-app.vercel.app";
}

// Every category page is a real address worth indexing, and the list grows by itself as shops register.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const businesses = await getDirectorySafely();
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/businesses`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...categoriesOf(businesses).map((c) => ({
      url: `${base}/businesses/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
