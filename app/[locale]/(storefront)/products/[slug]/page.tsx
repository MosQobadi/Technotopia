import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { InventoryStatus } from "@/types/inventory";
import { getStorefrontProductBySlug } from "@/server/storefront-product.service";
import { breadcrumbJsonLd, localeAlternates, type BreadcrumbTrailItem } from "@/lib/seo";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { PriceTag } from "@/components/storefront/ui/PriceTag";
import { ProductGallery } from "@/components/storefront/ui/ProductGallery";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { StockStatusBadge } from "@/components/storefront/ui/StatusBadge";
import { ProductGrid } from "@/components/storefront/products/ProductGrid";
import { ProductPurchasePanel } from "@/components/storefront/products/ProductPurchasePanel";

// ISR: product detail is server-rendered from the database and is identical for
// every visitor, so each slug is generated on first request and re-used for up
// to 5 minutes. Price/stock edits in the admin surface within that window.
export const revalidate = 300;

// Empty on purpose: nothing is prerendered at build time (the build host has no
// guaranteed DB access — see app/sitemap.ts), but declaring the function is what
// puts this route on the ISR path instead of rendering it fresh on every request.
export async function generateStaticParams() {
  return [];
}

const STOCK_STATUS: Record<InventoryStatus, "in-stock" | "low-stock" | "out-of-stock"> = {
  IN_STOCK: "in-stock",
  LOW_STOCK: "low-stock",
  OUT_OF_STOCK: "out-of-stock",
};

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

// The page renders itself: the row is awaited here and the name, price, stock,
// tags, description, breadcrumbs and the related grid all go out in the HTML.
// The metadata and the two JSON-LD blocks are built from that same row, so a
// crawler reads the same product a visitor does. Three things stay on the
// client, because they are the only three that respond to a click: the gallery's
// thumbnail selection, the quantity/add-to-cart/wishlist strip, and the hearts
// on the related cards.
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const result = await getStorefrontProductBySlug(slug);
  if (!result) notFound();

  const { product, related } = result;

  const t = await getTranslations("productDetail");
  const tCommon = await getTranslations("common");

  const breadcrumbItems: BreadcrumbTrailItem[] = [
    { label: tCommon("home"), href: "/" },
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
    <main className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)) }}
      />

      <Breadcrumb items={breadcrumbItems} className="mb-7" />

      <div className="mb-18 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.image ? [product.image] : []} alt={product.name} />

        <div>
          <div className="text-accent-readable mb-2.5 text-xs tracking-wide uppercase">
            {product.category} · {product.brand}
          </div>
          <h1 className="text-fg text-title mb-3.5">{product.name}</h1>
          <PriceTag
            price={product.price}
            originalPrice={product.originalPrice}
            discountPercent={product.discountPercent}
            size="lg"
            className="mb-2.5"
          />
          <StockStatusBadge status={STOCK_STATUS[product.stockStatus]} className="mb-6" />

          {product.tags.length > 0 && (
            <div className="mb-7 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-fg-muted uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <ProductPurchasePanel productId={product.id} price={product.price} />

          <div className="border-t border-line pt-6">
            <h2 className="text-fg text-subhead mb-3">{t("description")}</h2>
            <p className="text-[15px] leading-relaxed text-fg-muted">{product.longDescription}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <SectionEyebrow label={t("relatedEyebrow")} />
          <h2 className="text-fg text-heading mb-6">{t("relatedHeading")}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </main>
  );
}
