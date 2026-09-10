// One product's price as the storefront shows it, in one place — the three
// services that build a card view (home, catalog, wishlist) were each running
// this same arithmetic, which is how the two halves of it drifted apart. The
// admin reads it too — the product list's final price and the form's preview
// of it — so the price an admin previews is the price the storefront charges.
//
// The percentage is carried rather than left to be re-derived from the pair.
// Rounding the sale price to a whole rial loses up to half of one, and
// inverting that back into a percentage can land a point below what the admin
// typed: a 15%-off product priced at 50 sells for 43 (42.5, rounded), and
// 1 − 43/50 reads as 14%. The number on the badge should be the number in the
// database.

export interface DisplayPrice {
  /** What the customer pays. */
  price: number;
  /** The pre-discount price, present only when there is one to strike through. */
  originalPrice?: number;
  /** 0 when the product is not discounted. */
  discountPercent: number;
}

export function toDisplayPrice(price: number, discountPercent: number): DisplayPrice {
  if (discountPercent <= 0) return { price, discountPercent: 0 };

  return {
    price: Math.round(price * (1 - discountPercent / 100)),
    originalPrice: price,
    discountPercent,
  };
}
