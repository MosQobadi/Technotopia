import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getHomeData } from "@/server/home.service";
import { localeAlternates } from "@/lib/seo";
import { HomeHero } from "@/components/storefront/home/HomeHero";
import { StarsSection } from "@/components/storefront/home/StarsSection";
import { BestSellersSection } from "@/components/storefront/home/BestSellersSection";

// Reads from the database, so it is generated per request rather than
// prerendered at build time — the build host isn't guaranteed to have DB access
// (see app/sitemap.ts, and the builder stage in the Dockerfile). The `revalidate
// = 300` this page used to carry can't do the job here: unlike
// products/[slug], this route has no dynamic segment of its own, so an empty
// generateStaticParams doesn't override the locale params app/[locale]/layout.tsx
// enumerates, and both locales get prerendered anyway.
//
// It costs nothing against what was here before: the client fetch this replaces
// hit /api/storefront/home — an uncached route handler — on every visitor, so
// the same queries ran per request, just after a blank paint and a round trip.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.home");
  return {
    title: t("title"),
    description: t("description"),
    alternates: localeAlternates("/"),
  };
}

// The data is read through the service layer directly rather than through this
// app's own /api/storefront/home route: same function that route serves, minus
// an HTTP round-trip to ourselves (and minus the blank first paint that came
// with fetching it from the client). The route stays — it is the public
// contract — it just isn't this page's data source.
export default async function HomePage() {
  const { banners, featuredProducts, bestSellers, categories, brands } = await getHomeData();

  return (
    <main>
      <HomeHero banners={banners} />
      <StarsSection products={featuredProducts} />
      <section className="mx-auto max-w-320 px-6 py-16" aria-hidden="true" />
      <BestSellersSection products={bestSellers} categories={categories} brands={brands} />
    </main>
  );
}
