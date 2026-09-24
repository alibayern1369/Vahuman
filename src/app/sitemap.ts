import type { MetadataRoute } from "next";

import {
  listActiveBrandSlugs,
  listActiveCategorySlugs,
  listPublishedProductSlugs,
} from "@/lib/storefront/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [products, categories, brands] = await Promise.all([
    listPublishedProductSlugs(),
    listActiveCategorySlugs(),
    listActiveBrandSlugs(),
  ]);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/search`, changeFrequency: "weekly", priority: 0.5 },
    ...products.map((item) => ({
      url: `${base}/product/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...categories.map((item) => ({
      url: `${base}/category/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...brands.map((item) => ({
      url: `${base}/brand/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
