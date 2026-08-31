import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { ProductsContent } from "./ProductsContent";

// No `revalidate` here, unlike Home and Product Detail: generateMetadata below
// awaits searchParams to give /products?category=<slug> its own title and
// canonical (the sitemap lists one such URL per category), and reading
// searchParams opts the whole route into dynamic rendering — a `revalidate`
// export would be silently ignored. The cost is small: the page renders a
// client-fetched shell with no server-side database work.

interface ProductsPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const t = await getTranslations("meta.products");
  const alternates = localeAlternates(category ? `/products?category=${category}` : "/products");

  if (category) {
    return {
      title: category,
      description: t("categoryDescription", { category }),
      alternates,
    };
  }

  return {
    title: t("allTitle"),
    description: t("allDescription"),
    alternates,
  };
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
