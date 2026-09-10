import { describe, expect, it } from "vitest";
import { reconcileCart, type CartCatalogEntry, type StoredCartItem } from "./cart";
import {
  checkoutFailure,
  checkoutSummaryLines,
  GUEST_RECEIPT_PATH,
  receiptPath,
  toOrderPayload,
} from "./checkout";
import type { CheckoutDetailsInput } from "@/lib/validation";

function stored(productId: string, quantity: number, addedAt: string): StoredCartItem {
  return { productId, quantity, addedAt, capturedPrice: 1000 };
}

function entry(productId: string, overrides: Partial<CartCatalogEntry> = {}): CartCatalogEntry {
  return {
    productId,
    slug: productId,
    name: `Product ${productId}`,
    image: null,
    category: "Cameras",
    unitPrice: 1000,
    discountPercent: 0,
    stock: 10,
    isAvailable: true,
    ...overrides,
  };
}

const DETAILS: CheckoutDetailsInput = {
  fullName: "Sara Ahmadi",
  phone: "0912 000 0000",
  address: "12 Vali Asr St",
  city: "Tehran",
  postalCode: "1234567890",
  paymentMethod: "BANK_TRANSFER",
};

// One line that ships in full, one whose stock fell under the quantity asked
// for, and one that ships nothing — the three things a summary has to say.
const cart = reconcileCart(
  [
    stored("full", 2, "2026-09-01T10:00:00.000Z"),
    stored("short", 5, "2026-09-01T11:00:00.000Z"),
    stored("gone", 1, "2026-09-01T12:00:00.000Z"),
  ],
  [entry("full"), entry("short", { stock: 3 }), entry("gone", { isAvailable: false })],
);

describe("checkoutSummaryLines", () => {
  it("lists what ships, at the quantity it ships at", () => {
    expect(checkoutSummaryLines(cart)).toEqual([
      { productId: "full", name: "Product full", quantity: 2, lineTotal: 2000 },
      { productId: "short", name: "Product short", quantity: 3, lineTotal: 3000 },
    ]);
  });

  it("adds up to the subtotal the summary prints", () => {
    const listed = checkoutSummaryLines(cart).reduce((sum, line) => sum + line.lineTotal, 0);
    expect(listed).toBe(cart.subtotal);
  });

  it("claims nothing for a cart the catalog has not answered for", () => {
    const unchecked = reconcileCart([stored("full", 1, "2026-09-01T10:00:00.000Z")], []);
    expect(checkoutSummaryLines(unchecked)).toEqual([]);
  });
});

describe("toOrderPayload", () => {
  it("sends exactly the lines the summary lists, as ids and quantities only", () => {
    const payload = toOrderPayload(DETAILS, cart);
    expect(payload.items).toEqual(
      checkoutSummaryLines(cart).map(({ productId, quantity }) => ({ productId, quantity })),
    );
  });

  it("carries the form's details through unchanged", () => {
    expect(toOrderPayload(DETAILS, cart)).toMatchObject(DETAILS);
  });
});

describe("receiptPath", () => {
  it("hands a guest their receipt rather than linking to a page they cannot open", () => {
    expect(receiptPath({ id: "ord1", total: 1, isGuest: true })).toBe(GUEST_RECEIPT_PATH);
  });

  it("sends a signed-in customer to their order's own page", () => {
    expect(receiptPath({ id: "ord1", total: 1, isGuest: false })).toBe("/orders/ord1/confirmation");
  });
});

describe("checkoutFailure", () => {
  it("names a refusal by its status, not by the server's English text", () => {
    expect(checkoutFailure(409)).toBe("cartChanged");
    expect(checkoutFailure(429)).toBe("rateLimited");
    expect(checkoutFailure(400)).toBe("failed");
    expect(checkoutFailure(500)).toBe("failed");
    // No response at all — the request never reached the server.
    expect(checkoutFailure(0)).toBe("failed");
  });
});
