import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { localeAlternates } from "@/lib/seo";
import { ProductsContent } from "./ProductsContent";

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
