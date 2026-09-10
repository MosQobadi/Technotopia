import { describe, expect, it } from "vitest";
import {
  addToStoredCart,
  cartBlocker,
  cartIdsKey,
  cartLineIssue,
  cartScreenState,
  cartTotals,
  EMPTY_CART,
  lineCeiling,
  lineUnitPrice,
  MAX_CART_ITEMS,
  MAX_CART_QUANTITY,
  orderableLines,
  orderableQuantity,
  parseCartIds,
  pdpAddLimit,
  pdpSelection,
  pendingCart,
  reconcileCart,
  reconcileCartLine,
  removeFromStoredCart,
  serializeCartIds,
  setStoredQuantity,
  type CartCatalogEntry,
  type StoredCartItem,
} from "./cart";
import { STANDARD_DELIVERY_COST } from "./delivery";

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
      shipping: STANDARD_DELIVERY_COST,
      total: 2000 + STANDARD_DELIVERY_COST,
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

describe("pendingCart", () => {
  const items = [
    stored({ productId: "b", quantity: 1, addedAt: "2026-09-02T00:00:00.000Z" }),
    stored({ productId: "a", quantity: 2, addedAt: "2026-09-01T00:00:00.000Z" }),
  ];

  it("keeps the order the cart was filled in, the way a read against the catalog does", () => {
    expect(pendingCart(items).lines.map((line) => line.productId)).toEqual(["a", "b"]);
  });

  it("claims nothing about a product it has not asked about", () => {
    for (const line of pendingCart(items).lines) {
      expect(line.issue).toBeNull();
      expect(line.product).toBeNull();
    }
    expect(pendingCart(items).hasIssues).toBe(false);
  });

  it("totals the captured prices, since they are the only ones it has", () => {
    expect(pendingCart(items)).toMatchObject({
      itemCount: 3,
      subtotal: 3000,
      shipping: STANDARD_DELIVERY_COST,
      total: 3000 + STANDARD_DELIVERY_COST,
    });
  });

  it("is the empty cart when the browser holds nothing", () => {
    expect(pendingCart([])).toMatchObject({ lines: [], subtotal: 0, shipping: 0, total: 0 });
  });

  it("offers every line for order, because only the catalog could say otherwise", () => {
    expect(orderableLines(pendingCart(items))).toEqual([
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ]);
  });
});

describe("cartBlocker", () => {
  function cartOf(...entries: CartCatalogEntry[]) {
    return reconcileCart(
      entries.map((e, i) =>
        stored({ productId: e.productId, addedAt: `2026-09-0${i + 1}T00:00:00.000Z` }),
      ),
      entries,
    );
  }

  it("passes a cart every line of which can ship", () => {
    expect(cartBlocker(cartOf(entry({ productId: "a" }), entry({ productId: "b" })))).toBeNull();
  });

  it("passes an empty cart — there is nothing wrong with it, only nothing in it", () => {
    expect(cartBlocker(reconcileCart([], []))).toBeNull();
  });

  it("stops on a line that ships nothing", () => {
    expect(cartBlocker(cartOf(entry({ productId: "a", stock: 0 })))).toBe("outOfStock");
    expect(cartBlocker(cartOf(entry({ productId: "a", isAvailable: false })))).toBe("unavailable");
  });

  it("lets a short line through: it still ships what is left, and says so", () => {
    const cart = reconcileCart(
      [stored({ productId: "a", quantity: 5 })],
      [entry({ productId: "a", stock: 2 })],
    );
    expect(cart.lines[0]?.issue).toBe("exceedsStock");
    expect(cartBlocker(cart)).toBeNull();
  });

  it("lets a repriced line through: checkout settles the price against the catalog", () => {
    const cart = reconcileCart(
      [stored({ productId: "a" })],
      [entry({ productId: "a", unitPrice: 1200 })],
    );
    expect(cart.lines[0]?.issue).toBe("priceChanged");
    expect(cartBlocker(cart)).toBeNull();
  });

  it("reports the first blocking line, with the good and the bad mixed together", () => {
    const cart = cartOf(
      entry({ productId: "a" }),
      entry({ productId: "b", stock: 0 }),
      entry({ productId: "c", isAvailable: false }),
    );
    expect(cartBlocker(cart)).toBe("outOfStock");
  });
});

describe("cartIdsKey", () => {
  it("is the same key however the cart was filled", () => {
    expect(cartIdsKey([stored({ productId: "b" }), stored({ productId: "a" })])).toBe(
      cartIdsKey([stored({ productId: "a" }), stored({ productId: "b" })]),
    );
  });

  it("changes when a product joins or leaves, and not when a quantity does", () => {
    const cart = [stored({ productId: "a", quantity: 1 })];
    expect(cartIdsKey(cart)).toBe(cartIdsKey([stored({ productId: "a", quantity: 9 })]));
    expect(cartIdsKey(cart)).not.toBe(cartIdsKey([...cart, stored({ productId: "b" })]));
  });

  it("is empty for an empty cart, which is what an answer to nothing covers", () => {
    expect(cartIdsKey([])).toBe("");
  });
});

describe("pdpAddLimit", () => {
  it("offers the whole shelf when none of it is in the cart", () => {
    expect(pdpAddLimit(5, [], "p1")).toEqual({ inCart: 0, max: 5, blocker: null });
  });

  it("offers only what the cart has not already taken", () => {
    expect(pdpAddLimit(5, [stored({ quantity: 3 })], "p1")).toEqual({
      inCart: 3,
      max: 2,
      blocker: null,
    });
  });

  it("is out of stock at zero, whatever the cart holds", () => {
    expect(pdpAddLimit(0, [], "p1").blocker).toBe("outOfStock");
    expect(pdpAddLimit(0, [stored({ quantity: 2 })], "p1")).toEqual({
      inCart: 2,
      max: 0,
      blocker: "outOfStock",
    });
  });

  it("is blocked once the cart holds all of the shelf", () => {
    expect(pdpAddLimit(3, [stored({ quantity: 3 })], "p1")).toEqual({
      inCart: 3,
      max: 0,
      blocker: "allInCart",
    });
  });

  it("stops at the line ceiling on a deep shelf", () => {
    expect(pdpAddLimit(500, [], "p1").max).toBe(MAX_CART_QUANTITY);
    expect(pdpAddLimit(500, [stored({ quantity: MAX_CART_QUANTITY })], "p1").blocker).toBe(
      "allInCart",
    );
  });

  it("is blocked by a full cart only for a product not already in it", () => {
    const full = Array.from({ length: MAX_CART_ITEMS }, (_, i) =>
      stored({ productId: `other-${i}`, quantity: 1 }),
    );
    expect(pdpAddLimit(5, full, "p1").blocker).toBe("cartFull");

    const fullWithThis = [...full.slice(1), stored({ productId: "p1", quantity: 1 })];
    expect(pdpAddLimit(5, fullWithThis, "p1")).toEqual({ inCart: 1, max: 4, blocker: null });
  });
});

describe("lineCeiling", () => {
  it("is the shelf when the shelf is under the line cap", () => {
    expect(lineCeiling(5)).toBe(5);
  });

  it("is the line cap on a deep shelf, or while stock is not known", () => {
    expect(lineCeiling(500)).toBe(MAX_CART_QUANTITY);
    expect(lineCeiling(undefined)).toBe(MAX_CART_QUANTITY);
  });

  it("never goes below zero", () => {
    expect(lineCeiling(-2)).toBe(0);
  });
});

describe("pdpSelection", () => {
  it("prices the chosen quantity", () => {
    expect(pdpSelection(3, 5, 1000)).toEqual({ quantity: 3, subtotal: 3000 });
  });

  it("holds a choice the limit has fallen under to the limit, and prices that", () => {
    expect(pdpSelection(4, 2, 1000)).toEqual({ quantity: 2, subtotal: 2000 });
  });

  it("never shows fewer than one", () => {
    expect(pdpSelection(0, 5, 1000).quantity).toBe(1);
    expect(pdpSelection(3, 0, 1000).quantity).toBe(1);
  });
});

describe("lineUnitPrice", () => {
  it("is the catalog's price once it has answered", () => {
    const line = reconcileCartLine(stored({ capturedPrice: 1000 }), entry({ unitPrice: 1200 }));
    expect(lineUnitPrice(line)).toBe(1200);
  });

  it("is the price the line went in at while the catalog has nothing to say", () => {
    const line = reconcileCartLine(stored({ capturedPrice: 1000 }), null);
    expect(lineUnitPrice(line)).toBe(1000);
  });
});

describe("cartScreenState", () => {
  const read = { hasHydrated: true, isVerified: false, lookupFailed: false };

  it("is loading until the browser's cart has been read — and not empty meanwhile", () => {
    expect(cartScreenState(EMPTY_CART, { ...read, hasHydrated: false })).toMatchObject({
      status: "loading",
      isEmpty: false,
      canCheckout: false,
    });
  });

  it("is checking while the catalog has not answered, and cannot be ordered", () => {
    expect(cartScreenState(pendingCart([stored()]), read)).toMatchObject({
      status: "checking",
      blocker: null,
      canCheckout: false,
    });
  });

  it("is failed when the lookup did not answer", () => {
    const state = cartScreenState(pendingCart([stored()]), { ...read, lookupFailed: true });
    expect(state.status).toBe("failed");
  });

  it("is ready once verified, even with a failure left over from an earlier lookup", () => {
    const cart = reconcileCart([stored()], [entry()]);
    expect(
      cartScreenState(cart, { ...read, isVerified: true, lookupFailed: true }),
    ).toMatchObject({ status: "ready", canCheckout: true });
  });

  it("is empty once read and holding nothing, and an empty cart cannot be ordered", () => {
    expect(cartScreenState(EMPTY_CART, { ...read, isVerified: true })).toMatchObject({
      status: "ready",
      isEmpty: true,
      canCheckout: false,
    });
  });

  it("names a blocker only once ready, and a blocked cart cannot be ordered", () => {
    const blocked = reconcileCart([stored()], [entry({ stock: 0 })]);
    expect(cartScreenState(blocked, { ...read, isVerified: true })).toMatchObject({
      blocker: "outOfStock",
      canCheckout: false,
    });
    expect(cartScreenState(blocked, read).blocker).toBeNull();
  });
});
