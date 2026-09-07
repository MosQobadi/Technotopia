import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontFilterOption } from "@/types/product";
import type { StorefrontProductSort } from "@/lib/validation";

// The product listing's shared vocabulary. The PLP has no store and no state
// hook: its filters, its sort and its page all live in the query string, so the
// server can render the whole grid and a filtered view stays linkable, shareable
// and reachable with the back button. Everything here is either "read that query
// string" or "write the next one" — the sidebar, the sort control, the
// pagination links and the page itself all go through these, so none of them
// invents its own param name.

/** Six rows of the four-up grid. Not a URL param — the page size is ours, not the visitor's. */
export const PLP_PAGE_SIZE = 24;

export const DEFAULT_PRODUCT_SORT: StorefrontProductSort = "sold";

export const PRICE_RANGE_MIN = 0;
export const PRICE_RANGE_MAX = 90_000_000;
export const PRICE_RANGE_STEP = 500_000;

/** The PLP's own path, locale-free — `Link` from `@/i18n/navigation` adds the prefix. */
export const PRODUCTS_PATH = "/products";

/**
 * A whole PLP URL, minus the locale prefix its caller already knows. `category`
 * is a category slug and `brands` are brand slugs, which is what the sidebar
 * writes and what `app/sitemap.ts` already emits.
 */
export interface ProductListParams {
  category?: string;
  brands: string[];
  statuses: InventoryStatus[];
  maxPrice?: number;
  sort: StorefrontProductSort;
  page: number;
}

/**
 * Params are written in a fixed order, and anything at its default is left out
 * entirely, so one set of filters is always one URL — two spellings of the same
 * view would split the page's crawl budget for nothing.
 */
export function buildProductListHref(params: ProductListParams): string {
  const query = new URLSearchParams();

  if (params.category) query.set("category", params.category);
  for (const brand of params.brands) query.append("brand", brand);
  for (const status of params.statuses) query.append("status", status);
  if (params.maxPrice !== undefined && params.maxPrice < PRICE_RANGE_MAX) {
    query.set("maxPrice", String(params.maxPrice));
  }
  if (params.sort !== DEFAULT_PRODUCT_SORT) query.set("sort", params.sort);
  if (params.page > 1) query.set("page", String(params.page));

  const queryString = query.toString();
  return queryString === "" ? PRODUCTS_PATH : `${PRODUCTS_PATH}?${queryString}`;
}

/**
 * Any filter change starts the results over: page 4 of the old filters is rarely
 * a page of the new ones, and page 3 of "cheapest" is a different set of
 * products than page 3 of "newest".
 */
export function withProductListParams(
  params: ProductListParams,
  next: Partial<ProductListParams>,
): ProductListParams {
  return { ...params, page: 1, ...next };
}

// --- Resolving what the URL says to a real option ----------------------------

/**
 * Links into this listing were written in three vocabularies and all of them are
 * out in the wild: `app/sitemap.ts` emits `?category=<slug>`, the footer and the
 * navbar search emit `?category=<name>` / `?brand=<name>`, and an old client-side
 * link could carry an id. So a param matches on any of the three, and the
 * sidebar writes the slug — the one that reads well and matches the sitemap.
 */
export function resolveOptions(
  values: string[],
  options: StorefrontFilterOption[],
): StorefrontFilterOption[] {
  const resolved: StorefrontFilterOption[] = [];
  for (const value of values) {
    const needle = value.toLowerCase();
    const match = options.find(
      (option) =>
        option.slug.toLowerCase() === needle ||
        option.name.toLowerCase() === needle ||
        option.id === value,
    );
    // An unresolved value is a stale or hand-edited link, not a 404: the catalog
    // renders, just without that filter.
    if (match && !resolved.includes(match)) resolved.push(match);
  }
  return resolved;
}

// --- Pagination ------------------------------------------------------------

export function productPageCount(total: number, pageSize: number): number {
  return total === 0 ? 0 : Math.ceil(total / pageSize);
}

/**
 * The page numbers to render, with `"gap"` where a run was elided:
 * `[1, "gap", 6, 7, 8, "gap", 20]`. First and last are always present so a
 * crawler (and a customer) can reach both ends of the catalog from any page.
 */
export function paginationRange(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 0) return [];

  const current = Math.min(Math.max(page, 1), pageCount);
  const shown = new Set<number>([1, pageCount]);
  for (let candidate = current - 1; candidate <= current + 1; candidate++) {
    if (candidate >= 1 && candidate <= pageCount) shown.add(candidate);
  }

  const range: (number | "gap")[] = [];
  let previous = 0;
  for (const value of [...shown].sort((a, b) => a - b)) {
    // A gap hiding a single page is the same width as the page it hides, so a
    // run of one is rendered rather than elided.
    if (previous !== 0 && value - previous === 2) range.push(previous + 1);
    else if (previous !== 0 && value - previous > 2) range.push("gap");
    range.push(value);
    previous = value;
  }
  return range;
}
