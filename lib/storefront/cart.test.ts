import { describe, expect, it } from "vitest";
import {
  addToStoredCart,
  cartLineIssue,
  cartTotals,
  MAX_CART_ITEMS,
  MAX_CART_QUANTITY,
  orderableLines,
  orderableQuantity,
  parseCartIds,
  reconcileCart,
  reconcileCartLine,
  removeFromStoredCart,
  serializeCartIds,
  setStoredQuantity,
  SHIPPING_FLAT_RATE,
  type CartCatalogEntry,
  type StoredCartItem,
} from "./cart";

function stored(overrides: Partial<StoredCartItem> = {}): StoredCartItem {
  return {
    productId: "p1",
    quantity: 2,
    addedAt: "2026-09-01T10:00:00.000Z",
    capturedPrice: 1000,
    ...overrides,
  };
}

function entry(overrides: Partial<CartCatalogEntry> = {}): CartCatalogEntry {
  return {
    productId: "p1",
    slug: "p1",
    name: "Product One",
    image: null,
    category: "Cameras",
    unitPrice: 1000,
    discountPercent: 0,
    stock: 10,
    isAvailable: true,
    ...overrides,
  };
}

describe("cartLineIssue", () => {
  it("says nothing when the catalog still agrees with the snapshot", () => {
    expect(cartLineIssue(stored(), entry())).toBeNull();
  });

  it("calls a product the catalog has forgotten unavailable", () => {
    expect(cartLineIssue(stored(), undefined)).toBe("unavailable");
    expect(cartLineIssue(stored(), null)).toBe("unavailable");
  });

  it("calls a product that is no longer on sale unavailable, not out of stock", () => {
    expect(cartLineIssue(stored(), entry({ isAvailable: false, stock: 0 }))).toBe("unavailable");
  });

  it("reports zero stock", () => {
    expect(cartLineIssue(stored(), entry({ stock: 0 }))).toBe("outOfStock");
  });

  it("reports a quantity the shelf can no longer cover", () => {
    expect(cartLineIssue(stored({ quantity: 5 }), entry({ stock: 3 }))).toBe("exceedsStock");
    expect(cartLineIssue(stored({ quantity: 3 }), entry({ stock: 3 }))).toBeNull();
  });

  it("reports a price that moved in either direction", () => {
    expect(cartLineIssue(stored(), entry({ unitPrice: 1200 }))).toBe("priceChanged");
    expect(cartLineIssue(stored(), entry({ unitPrice: 800 }))).toBe("priceChanged");
  });

  it("leads with the issue that blocks the sale hardest", () => {
    // Out of stock AND repriced: the price is not the customer's problem yet.
    expect(cartLineIssue(stored(), entry({ stock: 0, unitPrice: 9999 }))).toBe("outOfStock");
    // Short AND repriced: the shortfall is the thing to act on.
    expect(cartLineIssue(stored({ quantity: 5 }), entry({ stock: 2, unitPrice: 9999 }))).toBe(
      "exceedsStock",
    );
  });
});

describe("orderableQuantity", () => {
  it("is nothing at all for a line that cannot be bought", () => {
    expect(orderableQuantity(stored(), undefined)).toBe(0);
    expect(orderableQuantity(stored(), entry({ isAvailable: false }))).toBe(0);
    expect(orderableQuantity(stored(), entry({ stock: 0 }))).toBe(0);
  });

  it("falls back to what is left on the shelf", () => {
    expect(orderableQuantity(stored({ quantity: 5 }), entry({ stock: 3 }))).toBe(3);
  });

  it("is the asked-for quantity when the shelf can cover it", () => {
    expect(orderableQuantity(stored({ quantity: 5 }), entry({ stock: 10 }))).toBe(5);
  });
});

describe("reconcileCartLine", () => {
  it("keeps the asked-for quantity even when only some of it can be bought", () => {
    const line = reconcileCartLine(stored({ quantity: 5 }), entry({ stock: 2 }));
    expect(line).toMatchObject({ quantity: 5, orderableQuantity: 2, issue: "exceedsStock" });
    expect(line.lineTotal).toBe(2000);
  });

  it("prices at the catalog's number, not the captured one", () => {
    const line = reconcileCartLine(stored({ quantity: 2 }), entry({ unitPrice: 1200 }));
    expect(line.lineTotal).toBe(2400);
    expect(line.capturedPrice).toBe(1000);
  });

  it("still renders a line for a product that vanished", () => {
    const line = reconcileCartLine(stored(), undefined);
    expect(line.product).toBeNull();
    expect(line.lineTotal).toBe(0);
    expect(line.issue).toBe("unavailable");
  });
});

describe("cartTotals", () => {
  it("counts what was asked for but charges for what can ship", () => {
    const lines = [
      reconcileCartLine(stored({ productId: "a", quantity: 2 }), entry({ productId: "a" })),
      reconcileCartLine(
        stored({ productId: "b", quantity: 3 }),
        entry({ productId: "b", stock: 0 }),
      ),
    ];
    expect(cartTotals(lines)).toEqual({
      itemCount: 5,
      subtotal: 2000,
      shipping: SHIPPING_FLAT_RATE,
      total: 2000 + SHIPPING_FLAT_RATE,
    });
  });

  it("charges no shipping when nothing in the cart can ship", () => {
    const lines = [reconcileCartLine(stored(), entry({ stock: 0 }))];
    expect(cartTotals(lines)).toMatchObject({ subtotal: 0, shipping: 0, total: 0 });
  });

  it("charges no shipping on an empty cart", () => {
    expect(cartTotals([])).toEqual({ itemCount: 0, subtotal: 0, shipping: 0, total: 0 });
  });
});

describe("reconcileCart", () => {
  const items = [
    stored({ productId: "b", addedAt: "2026-09-02T00:00:00.000Z" }),
    stored({ productId: "a", addedAt: "2026-09-01T00:00:00.000Z" }),
  ];

  it("lists the cart in the order it was filled", () => {
    const cart = reconcileCart(items, [entry({ productId: "a" }), entry({ productId: "b" })]);
    expect(cart.lines.map((line) => line.productId)).toEqual(["a", "b"]);
    expect(cart.hasIssues).toBe(false);
  });

  it("flags the cart as a whole when any one line has something to say", () => {
    const cart = reconcileCart(items, [entry({ productId: "a" })]);
    expect(cart.hasIssues).toBe(true);
    expect(cart.lines.find((line) => line.productId === "b")?.issue).toBe("unavailable");
  });

  it("ignores catalog entries for ids the cart does not hold", () => {
    const cart = reconcileCart(
      [stored({ productId: "a" })],
      [entry({ productId: "a" }), entry({ productId: "z" })],
    );
    expect(cart.lines).toHaveLength(1);
  });
});

describe("orderableLines", () => {
  it("submits only what can be bought, at the quantity it can be bought", () => {
    const cart = reconcileCart(
      [
        stored({ productId: "a", quantity: 2 }),
        stored({ productId: "b", quantity: 5, addedAt: "2026-09-02T00:00:00.000Z" }),
        stored({ productId: "c", quantity: 1, addedAt: "2026-09-03T00:00:00.000Z" }),
      ],
      [
        entry({ productId: "a" }),
        entry({ productId: "b", stock: 3 }),
        entry({ productId: "c", stock: 0 }),
      ],
    );
    expect(orderableLines(cart)).toEqual([
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 3 },
    ]);
  });
});

describe("the stored list", () => {
  it("adds a new line with its captured price", () => {
    const items = addToStoredCart([], "a", 2, 500, "2026-09-01T00:00:00.000Z");
    expect(items).toEqual([
      { productId: "a", quantity: 2, capturedPrice: 500, addedAt: "2026-09-01T00:00:00.000Z" },
    ]);
  });

  it("adds to the existing line rather than a second one, keeping its original addedAt", () => {
    const first = addToStoredCart([], "a", 2, 500, "2026-09-01T00:00:00.000Z");
    const second = addToStoredCart(first, "a", 3, 900, "2026-09-05T00:00:00.000Z");
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      quantity: 5,
      capturedPrice: 500,
      addedAt: "2026-09-01T00:00:00.000Z",
    });
  });

  it("clamps a quantity to the per-line ceiling", () => {
    const items = addToStoredCart([], "a", 500, 100, "2026-09-01T00:00:00.000Z");
    expect(items[0]?.quantity).toBe(MAX_CART_QUANTITY);
    expect(setStoredQuantity(items, "a", 500)[0]?.quantity).toBe(MAX_CART_QUANTITY);
  });

  it("refuses to grow past the cart-wide ceiling", () => {
    const full = Array.from({ length: MAX_CART_ITEMS }, (_, i) =>
      stored({ productId: `p${i}`, quantity: 1 }),
    );
    expect(addToStoredCart(full, "new", 1, 100, "2026-09-01T00:00:00.000Z")).toHaveLength(
      MAX_CART_ITEMS,
    );
    // An id already in the cart is not a new line, so it is still allowed to grow.
    expect(addToStoredCart(full, "p0", 1, 100, "2026-09-01T00:00:00.000Z")[0]?.quantity).toBe(2);
  });

  it("treats a quantity of zero as a removal, which is what the stepper's minus does at 1", () => {
    const items = [stored({ productId: "a" }), stored({ productId: "b" })];
    expect(setStoredQuantity(items, "a", 0).map((item) => item.productId)).toEqual(["b"]);
    expect(setStoredQuantity(items, "a", -3).map((item) => item.productId)).toEqual(["b"]);
  });

  it("removes a line", () => {
    const items = [stored({ productId: "a" }), stored({ productId: "b" })];
    expect(removeFromStoredCart(items, "a").map((item) => item.productId)).toEqual(["b"]);
    expect(removeFromStoredCart(items, "zzz")).toHaveLength(2);
  });
});

describe("parseCartIds", () => {
  it("reads nothing out of nothing", () => {
    expect(parseCartIds(null)).toEqual([]);
    expect(parseCartIds("")).toEqual([]);
    expect(parseCartIds(" , ,, ")).toEqual([]);
  });

  it("trims, drops blanks and de-duplicates, because the value came from the browser", () => {
    expect(parseCartIds(" a , b ,,a, c ")).toEqual(["a", "b", "c"]);
  });

  it("caps the list so one hand-edited query string cannot ask for the whole catalog", () => {
    const raw = Array.from({ length: MAX_CART_ITEMS + 20 }, (_, i) => `p${i}`).join(",");
    expect(parseCartIds(raw)).toHaveLength(MAX_CART_ITEMS);
  });

  it("round-trips what the store serializes", () => {
    const items = [stored({ productId: "a" }), stored({ productId: "b" })];
    expect(parseCartIds(serializeCartIds(items))).toEqual(["a", "b"]);
    expect(serializeCartIds([])).toBe("");
  });
});
