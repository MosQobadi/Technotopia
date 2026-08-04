"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontProductListResult } from "@/types/product";
import type { StorefrontProductSort } from "@/lib/validation";
import { breadcrumbJsonLd } from "@/lib/seo";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import {
  FilterSidebar,
  PRICE_RANGE_MAX,
} from "@/components/storefront/products/FilterSidebar";

const EMPTY_RESULT: StorefrontProductListResult = {
  products: [],
  total: 0,
  page: 1,
  pageSize: 100,
  categories: [],
  brands: [],
};

const SORT_OPTIONS: { value: StorefrontProductSort; label: string }[] = [
  { value: "sold", label: "Most Sold" },
  { value: "priceAsc", label: "Price: Low to High" },
  { value: "priceDesc", label: "Price: High to Low" },
  { value: "new", label: "Newest" },
];

const STATUS_BADGE: Record<Exclude<InventoryStatus, "IN_STOCK">, { label: string; tone: "warning" | "error" }> = {
  LOW_STOCK: { label: "LOW STOCK", tone: "warning" },
  OUT_OF_STOCK: { label: "OUT OF STOCK", tone: "error" },
};

export function ProductsContent() {
  const searchParams = useSearchParams();
  const urlCategoryParam = searchParams.get("category");

  const [data, setData] = useState<StorefrontProductListResult>(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(true);

  // undefined = the user hasn't touched the category filter yet, so the URL wins;
  // once they click a category (including "All"), that explicit choice always wins.
  const [manualCategoryId, setManualCategoryId] = useState<string | null | undefined>(undefined);
  const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<InventoryStatus>>(new Set());
  const [maxPrice, setMaxPrice] = useState(PRICE_RANGE_MAX);
  const [committedMaxPrice, setCommittedMaxPrice] = useState(PRICE_RANGE_MAX);
  const [sort, setSort] = useState<StorefrontProductSort>("sold");

  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateWishlist = useWishlistStore((state) => state.hydrate);
  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
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

  const activeCategoryId = manualCategoryId !== undefined ? manualCategoryId : resolvedUrlCategoryId;

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
    ? (data.categories.find((category) => category.id === activeCategoryId)?.name ?? "All")
    : "All";

  const breadcrumbItems = [{ label: "Home", href: "/" }, { label: activeCategoryLabel }];

  function toggleBrand(brandId: string) {
    setSelectedBrandIds((current) => {
      const next = new Set(current);
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
      <h1 className="mb-8 text-[34px] font-extrabold tracking-tight text-ink-900">
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
              {filteredProducts.length} products
            </span>
            <label className="sr-only" htmlFor="products-sort">
              Sort by
            </label>
            <select
              id="products-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as StorefrontProductSort)}
              className="bg-surface-100 rounded-full px-3.5 py-2.25 text-[13px] text-ink-900"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {!isLoading && filteredProducts.length === 0 ? (
            <p className="py-15 text-center font-mono text-[13px] text-gray-500">
              No products match these filters.
            </p>
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
                      : { kind: "status", ...STATUS_BADGE[product.stockStatus] }
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
