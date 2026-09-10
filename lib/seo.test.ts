import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, localeAlternates, productJsonLd, SITE_URL } from "./seo";

describe("localeAlternates", () => {
  it("serves English unprefixed and Farsi under /fa", () => {
    expect(localeAlternates("/products")).toEqual({
      canonical: `${SITE_URL}/products`,
      languages: {
        en: `${SITE_URL}/products`,
        fa: `${SITE_URL}/fa/products`,
        "x-default": `${SITE_URL}/products`,
      },
    });
  });

  it("gives the home page no trailing slash, so Farsi's home is /fa", () => {
    const { canonical, languages } = localeAlternates("/");
    expect(canonical).toBe(SITE_URL);
    expect(languages.fa).toBe(`${SITE_URL}/fa`);
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers from one and links every crumb but the page itself", () => {
    const { itemListElement } = breadcrumbJsonLd([
      { label: "Home", href: "/" },
      { label: "Shop", href: "/products" },
      { label: "Sony A7" },
    ]);
    expect(itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: "Sony A7" },
    ]);
  });
});

describe("productJsonLd", () => {
  const product = {
    id: "p1",
    name: "Sony A7",
    shortDescription: "A camera.",
    image: null,
    brand: "Sony",
    price: 1000,
    stockStatus: "IN_STOCK" as const,
  };

  it("offers the price the page shows, in rials", () => {
    expect(productJsonLd(product).offers).toMatchObject({ priceCurrency: "IRR", price: 1000 });
  });

  it("is in stock while any is left — low stock still sells", () => {
    expect(productJsonLd({ ...product, stockStatus: "LOW_STOCK" }).offers.availability).toBe(
      "https://schema.org/InStock",
    );
  });

  it("is out of stock only when none is left", () => {
    expect(productJsonLd({ ...product, stockStatus: "OUT_OF_STOCK" }).offers.availability).toBe(
      "https://schema.org/OutOfStock",
    );
  });

  it("leaves out an image it does not have", () => {
    expect(productJsonLd(product).image).toBeUndefined();
  });
});
