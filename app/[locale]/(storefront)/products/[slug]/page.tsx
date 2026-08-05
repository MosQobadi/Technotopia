import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getStorefrontProductBySlug } from "@/server/storefront-product.service";
import { breadcrumbJsonLd, localeAlternates, type BreadcrumbTrailItem } from "@/lib/seo";
import { ProductDetailContent } from "./ProductDetailContent";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getStorefrontProductBySlug(slug);
  if (!result) return {};

  const { product } = result;

  return {
    title: product.name,
    description: product.shortDescription,
    alternates: localeAlternates(`/products/${slug}`),
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const result = await getStorefrontProductBySlug(slug);
  if (!result) notFound();

  const { product, related } = result;

  const t = await getTranslations("common");
  const breadcrumbItems: BreadcrumbTrailItem[] = [
    { label: t("home"), href: "/" },
    { label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` },
    { label: product.name },
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.image ?? undefined,
    sku: product.id,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      priceCurrency: "IRR",
      price: product.price,
      availability:
        product.stockStatus === "OUT_OF_STOCK"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)) }}
      />
      <ProductDetailContent product={product} related={related} breadcrumbItems={breadcrumbItems} />
    </>
  );
}
