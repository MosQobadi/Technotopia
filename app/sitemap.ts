import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { listActiveCategorySlugs } from "@/server/category.service";
import { listActiveProductSlugs } from "@/server/storefront-product.service";

// Reads from the database, so it must be generated per-request rather than
// prerendered at build time — the build environment isn't guaranteed to have
// the same DB access as runtime (see Vercel build failure, 2026-08-05).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    listActiveProductSlugs(),
    listActiveCategorySlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.8 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/products?category=${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
