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

const UNFILTERED: ProductListParams = {
  brands: [],
  statuses: [],
  sort: DEFAULT_PRODUCT_SORT,
  page: 1,
};

/**
 * The listing narrowed to one category, by slug. Every link into a category —
 * the home shelf, the footer, search, the PDP's breadcrumb, the sitemap and the
 * canonical — is this URL, so one view has one address.
 */
export function categoryListHref(categorySlug: string): string {
  return buildProductListHref({ ...UNFILTERED, category: categorySlug });
}

/** The listing narrowed to one brand, by slug — the brand side of `categoryListHref`. */
export function brandListHref(brandSlug: string): string {
  return buildProductListHref({ ...UNFILTERED, brands: [brandSlug] });
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
 * Every link this app writes carries a slug, but links written before that are
 * out in the wild in two other vocabularies: `?category=<name>` / `?brand=<name>`
 * from the old footer and navbar search, and an id from an old client-side link.
 * So a param still matches on any of the three; only the slug is ever written.
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

/** A page number held to the pages there are — the URL's `page` is whatever someone typed. */
export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), pageCount);
}

/**
 * The page numbers to render, with `"gap"` where a run was elided:
 * `[1, "gap", 6, 7, 8, "gap", 20]`. First and last are always present so a
 * crawler (and a customer) can reach both ends of the catalog from any page.
 */
export function paginationRange(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 0) return [];

  const current = clampPage(page, pageCount);
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

// --- When the grid is empty ------------------------------------------------

/**
 * Why a listing has nothing to show, which decides what it offers instead:
 * - "pastEnd": there are results, just not on this page — a stale or
 *   hand-edited `page`. Back to page 1.
 * - "noMatch": the filters exclude everything. Show all products.
 * - "catalogEmpty": nothing is filtered and there is still nothing. "Show all
 *   products" here would be a link from the page to itself.
 */
export type ListingEmptyState = "pastEnd" | "noMatch" | "catalogEmpty";

export function listingEmptyState(
  params: ProductListParams,
  total: number,
  shown: number,
): ListingEmptyState | null {
  if (shown > 0) return null;
  if (total > 0) return "pastEnd";
  // Sort and page reorder or slice a result; they never empty it.
  const unsorted = buildProductListHref({ ...params, sort: DEFAULT_PRODUCT_SORT, page: 1 });
  return unsorted === PRODUCTS_PATH ? "catalogEmpty" : "noMatch";
}
