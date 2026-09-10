import { describe, expect, it } from "vitest";
import type { StorefrontFilterOption } from "@/types/product";
import {
  brandListHref,
  buildProductListHref,
  categoryListHref,
  clampPage,
  listingEmptyState,
  paginationRange,
  productPageCount,
  PRICE_RANGE_MAX,
  resolveOptions,
  withProductListParams,
  type ProductListParams,
} from "./plp";

const BASE: ProductListParams = {
  brands: [],
  statuses: [],
  sort: "sold",
  page: 1,
};

describe("categoryListHref and brandListHref", () => {
  it("give a single category or brand its one URL, by slug", () => {
    expect(categoryListHref("cameras")).toBe("/products?category=cameras");
    expect(brandListHref("boya")).toBe("/products?brand=boya");
  });

  it("write exactly what the sidebar writes for the same filter", () => {
    expect(categoryListHref("cameras")).toBe(
      buildProductListHref({ ...BASE, category: "cameras" }),
    );
    expect(brandListHref("boya")).toBe(buildProductListHref({ ...BASE, brands: ["boya"] }));
  });
});

describe("clampPage", () => {
  it("leaves a page that exists alone", () => {
    expect(clampPage(3, 5)).toBe(3);
  });

  it("holds a hand-edited page to the pages there are", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(-3, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
  });
});

describe("buildProductListHref", () => {
  it("leaves every default out, so the unfiltered listing is one bare URL", () => {
    expect(buildProductListHref(BASE)).toBe("/products");
    expect(buildProductListHref({ ...BASE, maxPrice: PRICE_RANGE_MAX })).toBe("/products");
  });

  it("writes params in a fixed order and repeats the multi-select ones", () => {
    expect(
      buildProductListHref({
        category: "cameras",
        brands: ["sony", "boya"],
        statuses: ["IN_STOCK", "LOW_STOCK"],
        maxPrice: 500,
        sort: "priceAsc",
        page: 2,
      }),
    ).toBe(
      "/products?category=cameras&brand=sony&brand=boya&status=IN_STOCK&status=LOW_STOCK&maxPrice=500&sort=priceAsc&page=2",
    );
  });
});

describe("withProductListParams", () => {
  it("sends any filter change back to page 1", () => {
    const next = withProductListParams({ ...BASE, page: 4 }, { category: "lights" });
    expect(next).toMatchObject({ category: "lights", page: 1 });
  });

  it("still honours an explicit page, which is what the pagination links pass", () => {
    expect(withProductListParams({ ...BASE, page: 4 }, { page: 5 }).page).toBe(5);
  });
});

describe("resolveOptions", () => {
  const options: StorefrontFilterOption[] = [
    { id: "cat_1", name: "Cameras", slug: "cameras" },
    { id: "cat_2", name: "Microphones", slug: "microphones" },
  ];

  it("matches a slug, a name or an id, because links exist in all three", () => {
    expect(resolveOptions(["cameras"], options)[0]?.id).toBe("cat_1");
    expect(resolveOptions(["Cameras"], options)[0]?.id).toBe("cat_1");
    expect(resolveOptions(["cat_1"], options)[0]?.id).toBe("cat_1");
  });

  it("drops what it can't resolve rather than failing the page", () => {
    expect(resolveOptions(["no-such-category", "microphones"], options)).toHaveLength(1);
  });

  it("doesn't count the same option twice", () => {
    expect(resolveOptions(["cameras", "Cameras"], options)).toHaveLength(1);
  });
});

describe("paginationRange", () => {
  it("has nothing to offer for an empty result", () => {
    expect(productPageCount(0, 24)).toBe(0);
    expect(paginationRange(1, 0)).toEqual([]);
  });

  it("lists every page while they still fit", () => {
    expect(paginationRange(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("elides long runs but always keeps both ends reachable", () => {
    expect(paginationRange(7, 20)).toEqual([1, "gap", 6, 7, 8, "gap", 20]);
  });

  it("renders a run of one rather than a gap the same width as the page it hides", () => {
    expect(paginationRange(4, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("listingEmptyState", () => {
  it("has nothing to say about a page with products on it", () => {
    expect(listingEmptyState(BASE, 30, 24)).toBeNull();
  });

  it("calls a page beyond the last one past the end, not a filter miss", () => {
    expect(listingEmptyState({ ...BASE, category: "cameras", page: 9 }, 30, 0)).toBe("pastEnd");
  });

  it("calls an empty filtered listing a filter miss", () => {
    expect(listingEmptyState({ ...BASE, category: "cameras" }, 0, 0)).toBe("noMatch");
    expect(listingEmptyState({ ...BASE, brands: ["boya"] }, 0, 0)).toBe("noMatch");
    expect(listingEmptyState({ ...BASE, statuses: ["LOW_STOCK"] }, 0, 0)).toBe("noMatch");
    expect(listingEmptyState({ ...BASE, maxPrice: 500 }, 0, 0)).toBe("noMatch");
  });

  it("doesn't count a sort as a filter, so an empty catalog is still an empty catalog", () => {
    expect(listingEmptyState(BASE, 0, 0)).toBe("catalogEmpty");
    expect(listingEmptyState({ ...BASE, sort: "priceDesc" }, 0, 0)).toBe("catalogEmpty");
    expect(listingEmptyState({ ...BASE, maxPrice: PRICE_RANGE_MAX }, 0, 0)).toBe("catalogEmpty");
  });
});
