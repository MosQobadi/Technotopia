import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { breadcrumbJsonLd, localeAlternates } from "@/lib/seo";
import {
  buildProductListHref,
  categoryListHref,
  PLP_PAGE_SIZE,
  PRODUCTS_PATH,
  productPageCount,
  resolveOptions,
  type ProductListParams,
} from "@/lib/storefront/plp";
import { storefrontProductListPageQuerySchema } from "@/lib/validation";
import { listBrandOptions } from "@/server/brand.service";
import { listCategoryOptions } from "@/server/category.service";
import { listStorefrontProducts } from "@/server/storefront-product.service";
import { navTrail } from "@/components/storefront/navLinks";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { Pagination } from "@/components/storefront/ui/Pagination";
import { FilterSidebar } from "@/components/storefront/products/FilterSidebar";
import { ProductGrid } from "@/components/storefront/products/ProductGrid";
import { ProductSortSelect } from "@/components/storefront/products/ProductSortSelect";

// The listing is the query string, rendered. Category, brand, status, price,
// sort and page are all search params, so a filtered view is one URL that
// survives a reload, the back button and a paste into someone else's browser —
// and arrives as HTML rather than as a shell that fetches itself.
//
// Reading searchParams already opts this route into dynamic rendering, so it
// needs no `revalidate` (which would be silently ignored) and no
// `force-dynamic` (which would be saying the same thing twice).

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { category } = storefrontProductListPageQuerySchema.parse(await searchParams);
  const t = await getTranslations("meta.products");

  if (category) {
    const [resolved] = resolveOptions([category], await listCategoryOptions());
    if (resolved) {
      return {
        title: resolved.name,
        description: t("categoryDescription", { category: resolved.name }),
        // Only the category survives into the canonical: app/sitemap.ts lists one
        // URL per category, but a brand, a sort or a page 3 of the same catalog
        // is the same listing narrowed, not a page of its own to index.
        alternates: localeAlternates(categoryListHref(resolved.slug)),
      };
    }
  }

  return {
    title: t("allTitle"),
    description: t("allDescription"),
    alternates: localeAlternates(PRODUCTS_PATH),
  };
}

// Data comes from server/ directly rather than by fetching this app's own
// GET /api/storefront/products — the same functions that route serves, minus an
// HTTP round-trip to ourselves. Same pattern as the home page (Task 28.1); the
// public route stays, it just isn't this page's data source.
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const query = storefrontProductListPageQuerySchema.parse(await searchParams);
  const t = await getTranslations("products");
  const tNav = await getTranslations("nav");

  const [categories, brands] = await Promise.all([listCategoryOptions(), listBrandOptions()]);

  // The URL may name a category or brand by slug, name or id; the grid filters
  // by id, and the sidebar and the pagination links write slugs back out.
  const [activeCategory] = resolveOptions(query.category ? [query.category] : [], categories);
  const activeBrands = resolveOptions(query.brand, brands);

  const params: ProductListParams = {
    category: activeCategory?.slug,
    brands: activeBrands.map((brand) => brand.slug),
    statuses: query.status,
    maxPrice: query.maxPrice,
    sort: query.sort,
    page: query.page,
  };

  const { products, total } = await listStorefrontProducts({
    categoryId: activeCategory?.id,
    brandIds: activeBrands.map((brand) => brand.id),
    stockStatuses: params.statuses,
    maxPrice: params.maxPrice,
    sort: params.sort,
    page: params.page,
    pageSize: PLP_PAGE_SIZE,
  });

  const pageCount = productPageCount(total, PLP_PAGE_SIZE);
  const heading = activeCategory?.name ?? t("all");
  const breadcrumbItems = activeCategory
    ? navTrail("shop", tNav, { label: activeCategory.name })
    : navTrail("shop", tNav);

  return (
    <main className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)) }}
      />
      <Breadcrumb items={breadcrumbItems} className="mb-5" />
      <h1 className="text-fg text-title mb-8">{heading}</h1>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[220px_1fr]">
        <FilterSidebar params={params} categories={categories} brands={brands} />

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-fg-subtle text-xs">{t("productsCount", { count: total })}</span>
            <ProductSortSelect params={params} />
          </div>

          {products.length === 0 ? (
            <p className="text-fg-subtle py-15 text-center text-[13px]">{t("noMatch")}</p>
          ) : (
            <ProductGrid products={products} />
          )}

          <Pagination
            page={params.page}
            pageCount={pageCount}
            hrefForPage={(page) => buildProductListHref({ ...params, page })}
          />
        </div>
      </div>
    </main>
  );
}
