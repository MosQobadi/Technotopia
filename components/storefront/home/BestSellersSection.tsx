"use client";

import { useMemo, useState } from "react";
import type { HomeBestSellerView, HomeOption } from "@/types/home";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";

const ALL = "All";

type SortOption = "sold" | "priceAsc" | "priceDesc" | "new";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "sold", label: "Most Sold" },
  { value: "priceAsc", label: "Price: Low to High" },
  { value: "priceDesc", label: "Price: High to Low" },
  { value: "new", label: "Newest" },
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
  }, [products, activeCategory, activeBrand, activeSort]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-320 px-6 pt-6 pb-24">
      <SectionEyebrow label="Best Sellers" />
      <h2 className="mb-7 text-[32px] font-extrabold tracking-tight text-ink-900">
        Gear people actually buy twice.
      </h2>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[ALL, ...categories.map((category) => category.name)].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveCategory(name)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2.25 text-[13px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                name === activeCategory ? "bg-ink-900 text-white" : "bg-surface-100 text-ink-900",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <label className="sr-only" htmlFor="best-sellers-brand">
            Brand
          </label>
          <select
            id="best-sellers-brand"
            value={activeBrand}
            onChange={(event) => setActiveBrand(event.target.value)}
            className="bg-surface-100 rounded-full px-3.5 py-2.25 text-[13px] text-ink-900"
          >
            {[ALL, ...brands.map((brand) => brand.name)].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="best-sellers-sort">
            Sort by
          </label>
          <select
            id="best-sellers-sort"
            value={activeSort}
            onChange={(event) => setActiveSort(event.target.value as SortOption)}
            className="bg-surface-100 rounded-full px-3.5 py-2.25 text-[13px] text-ink-900"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center font-mono text-[13px] text-gray-500">
          No products match these filters.
        </p>
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
              badge={{ kind: "rank", label: `#${product.rank} SOLD` }}
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
