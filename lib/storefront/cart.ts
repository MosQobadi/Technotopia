import { deliveryCost } from "./delivery";

// The cart as the browser keeps it, and the rules for reading it back.
//
// The cart is a browser object, not a database row: a visitor can fill one
// without an account, and only the order needs a customer. What the browser
// persists is deliberately thin — an id, a quantity, when it went in, and the
// unit price it went in at — because everything else about a product (its name,
// its photo, whether it is still on sale) can change while the cart sits there,
// and a stored copy of those would go stale silently.
//
// So the snapshot is reconciled against the catalog on every read:
// GET /api/storefront/cart?ids=... returns the current truth for those ids, and
// `reconcileCart` below merges the two into lines that can each say what is
// wrong with them. The rules live here, as pure functions over plain data, so
// the store, the cart page and the route share one definition of "unavailable"
// rather than three that drift.
//
// The captured price is the one field beyond the obvious three. Without it there
// is nothing to compare the current price against and `priceChanged` cannot be
// answered at all — the route receives only ids, so that comparison has to
// happen where the snapshot lives.

/** Per-line ceiling, matching the quantity the checkout schema accepts. */
export const MAX_CART_QUANTITY = 99;

/** Distinct products one cart may hold — also the cap on ids the lookup route reads. */
export const MAX_CART_ITEMS = 50;

/** One line as the browser persists it. */
export interface StoredCartItem {
  productId: string;
  quantity: number;
  /** ISO timestamp; the cart lists oldest first, the way it was filled. */
  addedAt: string;
  /** Unit price when the item went in — the only thing `priceChanged` can compare against. */
  capturedPrice: number;
}

/** One product as the catalog currently has it. The shape the lookup route returns. */
export interface CartCatalogEntry {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  /** What a unit costs now, discount already applied. */
  unitPrice: number;
  /** Pre-discount price, present only when there is one to strike through. */
  originalPrice?: number;
  discountPercent: number;
  stock: number;
  /** False for a product that is no longer ACTIVE — still in the catalog, not on sale. */
  isAvailable: boolean;
}

/**
 * What is wrong with a line, or null. At most one is reported: they are ordered
 * by how much they block the sale, and a product that cannot be bought at all
 * has no useful price story to tell.
 */
export type CartIssue = "unavailable" | "outOfStock" | "exceedsStock" | "priceChanged";

/** A stored line merged with the catalog — what the cart page renders. */
export interface CartLine {
  productId: string;
  /** What the customer asked for, unchanged by reconciliation. */
  quantity: number;
  addedAt: string;
  capturedPrice: number;
  /** Null when the product has left the catalog entirely; the line still renders. */
  product: CartCatalogEntry | null;
  issue: CartIssue | null;
  /** How many of it can actually be ordered right now — 0 when it cannot. */
  orderableQuantity: number;
  /** Current unit price times orderable quantity. 0 for a line that cannot be ordered. */
  lineTotal: number;
}

export interface ReconciledCart {
  lines: CartLine[];
  /** Units the customer asked for, across every line — what the header badge counts. */
  itemCount: number;
  subtotal: number;
  shipping: number;
  total: number;
  /** True when any line has something to say, so the page can lead with it. */
  hasIssues: boolean;
}

export const EMPTY_CART: ReconciledCart = {
  lines: [],
  itemCount: 0,
  subtotal: 0,
  shipping: 0,
  total: 0,
  hasIssues: false,
};

/** The one rule for a line, in the order the issues block a sale. */
export function cartLineIssue(
  stored: StoredCartItem,
  product: CartCatalogEntry | null | undefined,
): CartIssue | null {
  if (!product || !product.isAvailable) return "unavailable";
  if (product.stock <= 0) return "outOfStock";
  if (stored.quantity > product.stock) return "exceedsStock";
  if (product.unitPrice !== stored.capturedPrice) return "priceChanged";
  return null;
}

/** How many units of a line can be ordered as it stands. */
export function orderableQuantity(
  stored: StoredCartItem,
  product: CartCatalogEntry | null | undefined,
): number {
  if (!product || !product.isAvailable || product.stock <= 0) return 0;
  return Math.min(stored.quantity, product.stock);
}

export function reconcileCartLine(
  stored: StoredCartItem,
  product: CartCatalogEntry | null | undefined,
): CartLine {
  const resolved = product ?? null;
  const quantity = orderableQuantity(stored, resolved);
  return {
    productId: stored.productId,
    quantity: stored.quantity,
    addedAt: stored.addedAt,
    capturedPrice: stored.capturedPrice,
    product: resolved,
    issue: cartLineIssue(stored, resolved),
    orderableQuantity: quantity,
    lineTotal: resolved ? resolved.unitPrice * quantity : 0,
  };
}

/** Totals over already-reconciled lines. Shipping is charged on anything orderable. */
export function cartTotals(
  lines: CartLine[],
): Pick<ReconciledCart, "itemCount" | "subtotal" | "shipping" | "total"> {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = deliveryCost(subtotal);
  return { itemCount, subtotal, shipping, total: subtotal + shipping };
}

/** The cart lists oldest first, the way it was filled — in both readings below. */
function byAddedAt(a: StoredCartItem, b: StoredCartItem): number {
  return a.addedAt.localeCompare(b.addedAt);
}

/**
 * The stored snapshot read against the catalog. Lines keep the order they were
 * added in; an id the catalog knows nothing about still gets a line, so the
 * customer sees what disappeared rather than a cart that quietly shrank.
 */
export function reconcileCart(
  stored: StoredCartItem[],
  entries: CartCatalogEntry[],
): ReconciledCart {
  const byId = new Map(entries.map((entry) => [entry.productId, entry]));
  const lines = [...stored]
    .sort(byAddedAt)
    .map((item) => reconcileCartLine(item, byId.get(item.productId)));

  return {
    lines,
    ...cartTotals(lines),
    hasIssues: lines.some((line) => line.issue !== null),
  };
}

/**
 * The cart as the browser alone can describe it: every line at the quantity and
 * price it was added at, and no line claiming to know anything it does not.
 *
 * This is what a caller renders before the catalog has answered, and after one
 * that failed. The alternative — reconciling against an empty list of entries —
 * reports every product in the cart as gone, which is the one thing a cart must
 * not say when the truth is that we could not ask.
 */
export function pendingCart(stored: StoredCartItem[]): ReconciledCart {
  const lines: CartLine[] = [...stored].sort(byAddedAt).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    addedAt: item.addedAt,
    capturedPrice: item.capturedPrice,
    product: null,
    issue: null,
    orderableQuantity: item.quantity,
    lineTotal: item.capturedPrice * item.quantity,
  }));

  return { lines, ...cartTotals(lines), hasIssues: false };
}

/** The lines an order can be placed for, at the quantity it can be placed for. */
export function orderableLines(cart: ReconciledCart): { productId: string; quantity: number }[] {
  return cart.lines
    .filter((line) => line.orderableQuantity > 0)
    .map((line) => ({ productId: line.productId, quantity: line.orderableQuantity }));
}

/** The issues that ship nothing at all, and so stop the order rather than shrink it. */
export type CartBlocker = Extract<CartIssue, "unavailable" | "outOfStock">;

/**
 * The first reason the cart cannot be ordered as it stands, or null.
 *
 * Only a line that ships *nothing* blocks. `exceedsStock` ships what is left and
 * the line says so; `priceChanged` is settled server-side at checkout, against
 * the catalog rather than against the snapshot. A line that ships nothing is
 * different in kind: carrying it through would place an order missing a product
 * the customer believes they bought, and the line's own copy already asks for it
 * to be removed.
 */
export function cartBlocker(cart: ReconciledCart): CartBlocker | null {
  for (const line of cart.lines) {
    if (line.issue === "unavailable" || line.issue === "outOfStock") return line.issue;
  }
  return null;
}

// --- The stored list itself -------------------------------------------------
// Plain list operations, kept here rather than inlined in the store so the
// clamping rules are testable without a React tree.

export function addToStoredCart(
  items: StoredCartItem[],
  productId: string,
  quantity: number,
  capturedPrice: number,
  addedAt: string,
): StoredCartItem[] {
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    return setStoredQuantity(items, productId, existing.quantity + quantity);
  }
  if (items.length >= MAX_CART_ITEMS) return items;

  const clamped = clampQuantity(quantity);
  if (clamped === 0) return items;
  return [...items, { productId, quantity: clamped, addedAt, capturedPrice }];
}

/** A quantity of zero or less removes the line — that is what the stepper's minus does at 1. */
export function setStoredQuantity(
  items: StoredCartItem[],
  productId: string,
  quantity: number,
): StoredCartItem[] {
  if (quantity <= 0) return removeFromStoredCart(items, productId);
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity: clampQuantity(quantity) } : item,
  );
}

export function removeFromStoredCart(items: StoredCartItem[], productId: string): StoredCartItem[] {
  return items.filter((item) => item.productId !== productId);
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(Math.max(Math.trunc(quantity), 0), MAX_CART_QUANTITY);
}

// --- The lookup query -------------------------------------------------------

/**
 * The `ids` query string, in both directions. Blanks and duplicates are dropped
 * and the list is capped, because the value arrives from a browser store that
 * anyone can edit — the route reads it with these same rules.
 */
export function parseCartIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id) seen.add(id);
    if (seen.size >= MAX_CART_ITEMS) break;
  }
  return [...seen];
}

export function serializeCartIds(items: Pick<StoredCartItem, "productId">[]): string {
  return items.map((item) => item.productId).join(",");
}

/**
 * The same ids in a stable order, whatever order the cart was filled in — what a
 * caller compares a held answer against to know whether it still covers the cart.
 */
export function cartIdsKey(items: Pick<StoredCartItem, "productId">[]): string {
  return [...new Set(items.map((item) => item.productId))].sort().join(",");
}
