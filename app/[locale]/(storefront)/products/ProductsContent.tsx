"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontProductListResult } from "@/types/product";
import type { StorefrontProductSort } from "@/lib/validation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { FilterSidebar, PRICE_RANGE_MAX } from "@/components/storefront/products/FilterSidebar";

const EMPTY_RESULT: StorefrontProductListResult = {
  products: [],
  total: 0,
  page: 1,
  pageSize: 100,
  categories: [],
  brands: [],
};

const SORT_VALUES: {
  value: StorefrontProductSort;
  key: "mostSold" | "priceAsc" | "priceDesc" | "newest";
}[] = [
  { value: "sold", key: "mostSold" },
  { value: "priceAsc", key: "priceAsc" },
  { value: "priceDesc", key: "priceDesc" },
  { value: "new", key: "newest" },
];

const STATUS_BADGE_TONE: Record<Exclude<InventoryStatus, "IN_STOCK">, "warning" | "error"> = {
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

export function ProductsContent() {
  const t = useTranslations("products");
  const tSort = useTranslations("common.sort");
  const tStatus = useTranslations("common.stockStatus");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const urlCategoryParam = searchParams.get("category");
  const urlBrandParam = searchParams.get("brand");

  const [data, setData] = useState<StorefrontProductListResult>(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(true);

  // undefined = the user hasn't touched the category filter yet, so the URL wins;
  // once they click a category (including "All"), that explicit choice always wins.
  const [manualCategoryId, setManualCategoryId] = useState<string | null | undefined>(undefined);
  // Same undefined-means-untouched rule as the category above.
  const [manualBrandIds, setManualBrandIds] = useState<Set<string> | undefined>(undefined);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<InventoryStatus>>(new Set());
  const [maxPrice, setMaxPrice] = useState(PRICE_RANGE_MAX);
  const [committedMaxPrice, setCommittedMaxPrice] = useState(PRICE_RANGE_MAX);
  const [sort, setSort] = useState<StorefrontProductSort>("sold");

  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateWishlist = useWishlistStore((state) => state.hydrate);
  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // `isWishlisted` itself is a stable function reference, so this component also has to
  // subscribe to `items` directly — otherwise it never re-renders when the wishlist changes.
  useWishlistStore((state) => state.items);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateWishlist();
  }, [user, hydrateWishlist]);

  // Footer's Shop links deep-link by category name (e.g. ?category=Cameras); resolve that
  // to a real categoryId once the option list is in, since the API filters by id.
  const resolvedUrlCategoryId = useMemo(() => {
    if (!urlCategoryParam || data.categories.length === 0) return null;
    const match = data.categories.find(
      (category) =>
        category.id === urlCategoryParam ||
        category.name.toLowerCase() === urlCategoryParam.toLowerCase(),
    );
    return match?.id ?? null;
  }, [urlCategoryParam, data.categories]);

  const activeCategoryId =
    manualCategoryId !== undefined ? manualCategoryId : resolvedUrlCategoryId;

  // The navbar search's brand results deep-link by name (?brand=Sony), the same way the
  // footer's do for categories. Brands are a client-side filter here rather than an API
  // one, so this seeds the checkbox selection instead of the request.
  const resolvedUrlBrandIds = useMemo(() => {
    if (!urlBrandParam || data.brands.length === 0) return new Set<string>();
    const match = data.brands.find(
      (brand) =>
        brand.id === urlBrandParam || brand.name.toLowerCase() === urlBrandParam.toLowerCase(),
    );
    return match ? new Set([match.id]) : new Set<string>();
  }, [urlBrandParam, data.brands]);

  const selectedBrandIds = manualBrandIds ?? resolvedUrlBrandIds;

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ sort, pageSize: "100" });
    if (activeCategoryId) params.set("category", activeCategoryId);
    if (committedMaxPrice < PRICE_RANGE_MAX) params.set("maxPrice", String(committedMaxPrice));

    fetch(`/api/storefront/products?${params}`)
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (result?.success) setData(result.data as StorefrontProductListResult);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, committedMaxPrice, sort]);

  const selectedBrandNames = useMemo(
    () => new Set(data.brands.filter((brand) => selectedBrandIds.has(brand.id)).map((b) => b.name)),
    [data.brands, selectedBrandIds],
  );

  const filteredProducts = useMemo(() => {
    return data.products.filter(
      (product) =>
        (selectedBrandNames.size === 0 || selectedBrandNames.has(product.brand)) &&
        (selectedStatuses.size === 0 || selectedStatuses.has(product.stockStatus)),
    );
  }, [data.products, selectedBrandNames, selectedStatuses]);

  const activeCategoryLabel = activeCategoryId
    ? (data.categories.find((category) => category.id === activeCategoryId)?.name ?? t("all"))
    : t("all");

  const breadcrumbItems = [{ label: tCommon("home"), href: "/" }, { label: activeCategoryLabel }];

  function toggleBrand(brandId: string) {
    setManualBrandIds((current) => {
      const next = new Set(current ?? resolvedUrlBrandIds);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  }

  function toggleStatus(status: InventoryStatus) {
    setSelectedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbItems)) }}
      />
      <Breadcrumb items={breadcrumbItems} className="mb-5" />
      <h1 className="text-ink-900 mb-8 text-[34px] font-extrabold tracking-tight">
        {activeCategoryLabel}
      </h1>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[220px_1fr]">
        <FilterSidebar
          categories={data.categories}
          activeCategoryId={activeCategoryId}
          onCategoryChange={setManualCategoryId}
          brands={data.brands}
          selectedBrandIds={selectedBrandIds}
          onBrandToggle={toggleBrand}
          maxPrice={maxPrice}
          onMaxPriceInput={setMaxPrice}
          onMaxPriceCommit={setCommittedMaxPrice}
          selectedStatuses={selectedStatuses}
          onStatusToggle={toggleStatus}
        />

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs text-gray-500">
              {t("productsCount", { count: filteredProducts.length })}
            </span>
            <label className="sr-only" htmlFor="products-sort">
              {t("sortBy")}
            </label>
            <select
              id="products-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as StorefrontProductSort)}
              className="bg-surface-100 text-ink-900 rounded-full px-3.5 py-2.25 text-[13px]"
            >
              {SORT_VALUES.map((option) => (
                <option key={option.value} value={option.value}>
                  {tSort(option.key)}
                </option>
              ))}
            </select>
          </div>

          {!isLoading && filteredProducts.length === 0 ? (
            <p className="py-15 text-center font-mono text-[13px] text-gray-500">{t("noMatch")}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  href={`/products/${product.slug}`}
                  category={product.brand}
                  name={product.name}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  imageSrc={product.image ?? undefined}
                  badge={
                    product.stockStatus === "IN_STOCK"
                      ? undefined
                      : {
                          kind: "status",
                          label: tStatus(
                            product.stockStatus === "LOW_STOCK" ? "lowStock" : "outOfStock",
                          ).toUpperCase(),
                          tone: STATUS_BADGE_TONE[product.stockStatus],
                        }
                  }
                  isWishlisted={isWishlisted(product.id)}
                  onToggleWishlist={() => toggleWishlist(product.id)}
                  onAddToCart={() => addCartItem(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
