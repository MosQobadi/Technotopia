import type { CheckoutDetailsInput, CreateOrderInput } from "@/lib/validation";
import { orderableLines, type ReconciledCart } from "./cart";

// The checkout screen's own vocabulary: what it shows while the customer is
// still deciding, what it sends once they have, and what it is handed back.
//
// Pure, like lib/storefront/cart.ts, so the screen's claims can be checked
// without a browser. Nothing here is authoritative about money. Every figure a
// customer is charged is recomputed by `createOrder` from the catalog; what
// makes the summary agree with it is that both are built from the same parts —
// `toDisplayPrice` for a unit, `deliveryCost` for delivery — not that the server
// believes anything the screen sends. The request carries ids and quantities.

/** One line of the order summary. */
export interface CheckoutSummaryLine {
  productId: string;
  name: string;
  /** What will ship — for a line whose stock fell, less than was asked for. */
  quantity: number;
  lineTotal: number;
}

/**
 * The lines the order will carry, as the summary lists them: only what ships,
 * at the quantity it ships at. `orderableLines` builds the request with the same
 * filter, so the summary never lists a line the order leaves out.
 */
export function checkoutSummaryLines(cart: ReconciledCart): CheckoutSummaryLine[] {
  return cart.lines.flatMap((line) =>
    line.product && line.orderableQuantity > 0
      ? [
          {
            productId: line.productId,
            name: line.product.name,
            quantity: line.orderableQuantity,
            lineTotal: line.lineTotal,
          },
        ]
      : [],
  );
}

/** The order request: what the form collected, and the cart as ids and quantities. */
export function toOrderPayload(
  details: CheckoutDetailsInput,
  cart: ReconciledCart,
): CreateOrderInput {
  return { ...details, items: orderableLines(cart) };
}

/** What the order POST hands back. For a guest it is the receipt — the only copy they get. */
export interface PlacedOrder {
  id: string;
  total: number;
  /** No account behind the order, so there is no order page to send the customer to. */
  isGuest: boolean;
}

/** Where a guest's receipt is shown — from the response itself, not from the database. */
export const GUEST_RECEIPT_PATH = "/checkout/confirmation";

/**
 * Where the customer goes once the order exists. A signed-in customer's order
 * has a page they can open again; a guest's does not, and linking a guest to one
 * would land them on a 404 — so theirs is handed over instead.
 */
export function receiptPath(order: PlacedOrder): string {
  return order.isGuest ? GUEST_RECEIPT_PATH : `/orders/${order.id}/confirmation`;
}

/** Why the order POST was refused, in the screen's own terms. */
export type CheckoutFailure = "cartChanged" | "rateLimited" | "failed";

/**
 * The server's error text is English and written for the API, so the screen
 * says it again in the reader's language, keyed on the status alone. 409 is the
 * catalog moving under a cart that was fine when the page read it.
 */
export function checkoutFailure(status: number): CheckoutFailure {
  if (status === 409) return "cartChanged";
  if (status === 429) return "rateLimited";
  return "failed";
}
