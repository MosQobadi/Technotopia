"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontFilterOption } from "@/types/product";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  buildProductListHref,
  PRICE_RANGE_MAX,
  PRICE_RANGE_MIN,
  PRICE_RANGE_STEP,
  withProductListParams,
  type ProductListParams,
} from "@/lib/storefront/plp";

// The listing's filter rail. It holds no listing state of its own — every
// control writes the next URL and lets the server re-render the grid, which is
// what keeps a filtered view linkable and the page a Server Component. The one
// piece of local state is the price slider's in-flight position, which is where
// the thumb is rather than what the grid is filtered by: it commits on release.

const STATUS_OPTIONS: { value: InventoryStatus; key: "inStock" | "lowStock" | "outOfStock" }[] = [
  { value: "IN_STOCK", key: "inStock" },
  { value: "LOW_STOCK", key: "lowStock" },
  { value: "OUT_OF_STOCK", key: "outOfStock" },
];

interface FilterSidebarProps {
  params: ProductListParams;
  categories: StorefrontFilterOption[];
  brands: StorefrontFilterOption[];
}

export function FilterSidebar({ params, categories, brands }: FilterSidebarProps) {
  const t = useTranslations("products.filters");
  const tStatus = useTranslations("common.stockStatus");
  const tAll = useTranslations("products");
  const router = useRouter();

  const committedMaxPrice = params.maxPrice ?? PRICE_RANGE_MAX;

  function apply(next: Partial<ProductListParams>) {
    router.push(buildProductListHref(withProductListParams(params, next)));
  }

  function toggled<T>(values: T[], value: T): T[] {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  function commitMaxPrice(value: number) {
    if (value === committedMaxPrice) return;
    apply({ maxPrice: value >= PRICE_RANGE_MAX ? undefined : value });
  }

  return (
    <aside className="bg-surface-sunken sticky top-22 h-fit rounded-[20px] p-6">
      <div className="mb-7">
        <h2 className="text-label text-fg-muted mb-3.5">{t("category")}</h2>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => apply({ category: undefined })}
            className={cn(
              "focus-visible:outline-accent-readable text-start text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
              params.category === undefined
                ? "text-accent-readable font-bold"
                : "text-fg font-normal",
            )}
          >
            {tAll("all")}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => apply({ category: category.slug })}
              className={cn(
                "focus-visible:outline-accent-readable text-start text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
                params.category === category.slug
                  ? "text-accent-readable font-bold"
                  : "text-fg font-normal",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-7">
        <h2 className="text-label text-fg-muted mb-3.5">{t("brand")}</h2>
        <div className="flex flex-col gap-2.5">
          {brands.map((brand) => (
            <label key={brand.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={params.brands.includes(brand.slug)}
                onChange={() => apply({ brands: toggled(params.brands, brand.slug) })}
                className="accent-accent"
              />
              {brand.name}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-7">
        <h2 className="text-label text-fg-muted mb-3.5">{t("priceRange")}</h2>
        {/* Keyed on the committed price so the thumb follows the URL back on a
            Back button or a paste, not only on the drag that set it. */}
        <PriceRange
          key={committedMaxPrice}
          committedMaxPrice={committedMaxPrice}
          onCommit={commitMaxPrice}
        />
      </div>

      <div>
        <h2 className="text-label text-fg-muted mb-3.5">{t("status")}</h2>
        <div className="flex flex-col gap-2.5">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={params.statuses.includes(option.value)}
                onChange={() => apply({ statuses: toggled(params.statuses, option.value) })}
                className="accent-accent"
              />
              {tStatus(option.key)}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * The one control with local state, and it isn't listing state: it's where the
 * thumb is mid-drag. The grid only changes when the drag ends and the new
 * maximum reaches the URL.
 */
function PriceRange({
  committedMaxPrice,
  onCommit,
}: {
  committedMaxPrice: number;
  onCommit: (value: number) => void;
}) {
  const t = useTranslations("products.filters");
  const [maxPrice, setMaxPrice] = useState(committedMaxPrice);

  return (
    <>
      <input
        type="range"
        min={PRICE_RANGE_MIN}
        max={PRICE_RANGE_MAX}
        step={PRICE_RANGE_STEP}
        value={maxPrice}
        onChange={(event) => setMaxPrice(Number(event.target.value))}
        onMouseUp={(event) => onCommit(Number(event.currentTarget.value))}
        onTouchEnd={(event) => onCommit(Number(event.currentTarget.value))}
        onKeyUp={(event) => onCommit(Number(event.currentTarget.value))}
        aria-label={t("maxPrice")}
        className="accent-accent w-full"
      />
      <div className="text-fg-subtle mt-2 text-xs">
        {t("upTo", { price: formatPrice(maxPrice) })}
      </div>
    </>
  );
}
