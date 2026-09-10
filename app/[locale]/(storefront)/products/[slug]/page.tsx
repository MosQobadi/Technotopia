import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { InventoryStatus } from "@/types/inventory";
import { getStorefrontProductBySlug } from "@/server/storefront-product.service";
import { breadcrumbJsonLd, localeAlternates, productJsonLd } from "@/lib/seo";
import { categoryListHref } from "@/lib/storefront/plp";
import { navTrail } from "@/components/storefront/navLinks";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { PriceTag } from "@/components/storefront/ui/PriceTag";
import { ProductGallery } from "@/components/storefront/ui/ProductGallery";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { StockStatusBadge } from "@/components/storefront/ui/StatusBadge";
import { ProductGrid } from "@/components/storefront/products/ProductGrid";
import { ProductPurchasePanel } from "@/components/storefront/products/ProductPurchasePanel";

// ISR: product detail is server-rendered from the database and is identical for
// every visitor, so each slug is generated on first request and re-used for up
// to 5 minutes. Price edits in the admin surface within that window; a restock
// refreshes the page at once (the inventory PATCH revalidates it), because the
// people on its back-in-stock list are about to be told to come and look.
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
  const tNav = await getTranslations("nav");

  const breadcrumbItems = navTrail(
    "shop",
    tNav,
    { label: product.category, href: categoryListHref(product.categorySlug) },
    { label: product.name },
  );

  return (
    <main className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
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
          <StockStatusBadge
            status={STOCK_STATUS[product.stockStatus]}
            remaining={product.stock}
            className="mb-6"
          />

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

          <ProductPurchasePanel
            productId={product.id}
            slug={product.slug}
            price={product.price}
            stock={product.stock}
          />

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
