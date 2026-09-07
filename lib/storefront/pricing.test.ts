import { describe, expect, it } from "vitest";
import { toDisplayPrice } from "./pricing";

describe("toDisplayPrice", () => {
  it("leaves an undiscounted product alone, with no price to strike through", () => {
    expect(toDisplayPrice(1000, 0)).toEqual({ price: 1000, discountPercent: 0 });
  });

  it("moves the old price aside and applies the discount", () => {
    expect(toDisplayPrice(2000, 25)).toEqual({
      price: 1500,
      originalPrice: 2000,
      discountPercent: 25,
    });
  });

  it("reports the discount that was set, not the one the rounded price implies", () => {
    // 50 at 15% is 42.5, which rounds to 43 — and 1 − 43/50 is 14%. Re-deriving
    // the percentage from the rounded pair is what used to put "-14%" on a card
    // the admin had marked 15% off.
    const { price, discountPercent } = toDisplayPrice(50, 15);
    expect(price).toBe(43);
    expect(discountPercent).toBe(15);
  });

  it("treats a negative percentage as no discount rather than a markup", () => {
    expect(toDisplayPrice(1000, -10)).toEqual({ price: 1000, discountPercent: 0 });
  });
});
