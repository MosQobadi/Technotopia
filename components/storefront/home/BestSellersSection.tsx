"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { HomeBestSellerView, HomeOption } from "@/types/home";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";

type SortOption = "sold" | "priceAsc" | "priceDesc" | "new";

const SORT_KEYS: { value: SortOption; key: "mostSold" | "priceAsc" | "priceDesc" | "newest" }[] = [
  { value: "sold", key: "mostSold" },
  { value: "priceAsc", key: "priceAsc" },
  { value: "priceDesc", key: "priceDesc" },
  { value: "new", key: "newest" },
];

const SORTERS: Record<SortOption, (a: HomeBestSellerView, b: HomeBestSellerView) => number> = {
  sold: (a, b) => a.rank - b.rank,
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  new: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
};

interface BestSellersSectionProps {
  products: HomeBestSellerView[];
  categories: HomeOption[];
  brands: HomeOption[];
}

export function BestSellersSection({ products, categories, brands }: BestSellersSectionProps) {
  const t = useTranslations("home.bestSellers");
  const tSort = useTranslations("common.sort");
  const tAll = useTranslations("products");
  const ALL = tAll("all");
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [activeBrand, setActiveBrand] = useState(ALL);
  const [activeSort, setActiveSort] = useState<SortOption>("sold");

  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  const filtered = useMemo(() => {
    return products
      .filter(
        (product) =>
          (activeCategory === ALL || product.category === activeCategory) &&
          (activeBrand === ALL || product.brand === activeBrand),
      )
      .sort(SORTERS[activeSort]);
  }, [products, activeCategory, activeBrand, activeSort, ALL]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-320 px-6 pt-6 pb-24">
      <SectionEyebrow label={t("eyebrow")} />
      <h2 className="text-ink-900 text-title mb-7">{t("heading")}</h2>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[ALL, ...categories.map((category) => category.name)].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveCategory(name)}
              className={cn(
                "focus-visible:outline-accent cursor-pointer rounded-full px-4 py-2.25 text-[13px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
                name === activeCategory ? "bg-ink-900 text-white" : "bg-surface-100 text-ink-900",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <label className="sr-only" htmlFor="best-sellers-brand">
            {t("brand")}
          </label>
          <select
            id="best-sellers-brand"
            value={activeBrand}
            onChange={(event) => setActiveBrand(event.target.value)}
            className="bg-surface-100 text-ink-900 rounded-full px-3.5 py-2.25 text-[13px]"
          >
            {[ALL, ...brands.map((brand) => brand.name)].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="best-sellers-sort">
            {t("sortBy")}
          </label>
          <select
            id="best-sellers-sort"
            value={activeSort}
            onChange={(event) => setActiveSort(event.target.value as SortOption)}
            className="bg-surface-100 text-ink-900 rounded-full px-3.5 py-2.25 text-[13px]"
          >
            {SORT_KEYS.map((option) => (
              <option key={option.value} value={option.value}>
                {tSort(option.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-gray-500">{t("noMatch")}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              href={`/products/${product.slug}`}
              category={`${product.category} · ${product.brand}`}
              name={product.name}
              price={product.price}
              imageSrc={product.image ?? undefined}
              badge={{ kind: "rank", label: t("soldBadge", { rank: product.rank }) }}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={() => toggleWishlist(product.id)}
              onAddToCart={() => addCartItem(product.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
