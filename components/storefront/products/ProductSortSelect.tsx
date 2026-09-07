"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { StorefrontProductSort } from "@/lib/validation";
import { storefrontProductSortSchema } from "@/lib/validation";
import {
  buildProductListHref,
  DEFAULT_PRODUCT_SORT,
  withProductListParams,
  type ProductListParams,
} from "@/lib/storefront/plp";

// Sits above the grid rather than in the filter rail, because it doesn't change
// which products are shown — only their order. Same contract as FilterSidebar:
// the control writes the next URL, the server re-renders.

const SORT_VALUES: {
  value: StorefrontProductSort;
  key: "mostSold" | "priceAsc" | "priceDesc" | "newest";
}[] = [
  { value: "sold", key: "mostSold" },
  { value: "priceAsc", key: "priceAsc" },
  { value: "priceDesc", key: "priceDesc" },
  { value: "new", key: "newest" },
];

interface ProductSortSelectProps {
  params: ProductListParams;
}

export function ProductSortSelect({ params }: ProductSortSelectProps) {
  const t = useTranslations("products");
  const tSort = useTranslations("common.sort");
  const router = useRouter();

  // A `<select>` hands back a plain string; this turns it back into something
  // the params type accepts rather than casting it and hoping.
  function parseSort(value: string): StorefrontProductSort {
    const parsed = storefrontProductSortSchema.safeParse(value);
    return parsed.success ? parsed.data : DEFAULT_PRODUCT_SORT;
  }

  return (
    <>
      <label className="sr-only" htmlFor="products-sort">
        {t("sortBy")}
      </label>
      <select
        id="products-sort"
        value={params.sort}
        onChange={(event) =>
          router.push(
            buildProductListHref(
              withProductListParams(params, { sort: parseSort(event.target.value) }),
            ),
          )
        }
        className="bg-surface-sunken text-fg rounded-full px-3.5 py-2.25 text-[13px]"
      >
        {SORT_VALUES.map((option) => (
          <option key={option.value} value={option.value}>
            {tSort(option.key)}
          </option>
        ))}
      </select>
    </>
  );
}
