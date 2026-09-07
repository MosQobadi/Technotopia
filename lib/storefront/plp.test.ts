import { describe, expect, it } from "vitest";
import type { StorefrontFilterOption } from "@/types/product";
import {
  buildProductListHref,
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
