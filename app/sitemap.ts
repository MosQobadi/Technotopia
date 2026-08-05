import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { listActiveCategorySlugs } from "@/server/category.service";
import { listActiveProductSlugs } from "@/server/storefront-product.service";

// Reads from the database, so it must be generated per-request rather than
// prerendered at build time — the build environment isn't guaranteed to have
// the same DB access as runtime (see Vercel build failure, 2026-08-05).
export const dynamic = "force-dynamic";

// "as-needed" locale routing: English lives at the unprefixed path, Farsi
// under "/fa" — every entry lists both as hreflang alternates.
function localizedEntry(
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap[number] {
  const canonicalPath = path === "/" ? "" : path;
  return {
    url: `${SITE_URL}${canonicalPath}`,
    alternates: {
      languages: {
        en: `${SITE_URL}${canonicalPath}`,
        fa: `${SITE_URL}/fa${canonicalPath}`,
      },
    },
    ...rest,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    listActiveProductSlugs(),
    listActiveCategorySlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    localizedEntry("/", { changeFrequency: "daily", priority: 1 }),
    localizedEntry("/products", { changeFrequency: "daily", priority: 0.8 }),
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) =>
    localizedEntry(`/products/${product.slug}`, {
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) =>
    localizedEntry(`/products?category=${category.slug}`, {
      lastModified: category.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
