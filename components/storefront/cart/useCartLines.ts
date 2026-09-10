"use client";

import { useCallback, useEffect } from "react";
import { useCart, useCartStore, useCartVerified } from "@/lib/store/cart";
import { cartBlocker, type CartBlocker, type ReconciledCart } from "@/lib/storefront/cart";

// The cart page's data layer, kept out of the page itself: the store holds what
// the customer added, the lookup says what the catalog makes of it now, and
// `CartContent` only composes the two. Nothing here formats or renders, so the
// question "what may this screen claim right now?" is answerable in one file.
//
// The point of the split is `status`. A cart has four honest things to be —
// unread, unchecked, uncheckable, checked — and only the last of them may show
// a line's stock or price. Collapsing them, which is what reading `lines`
// straight from the store does, turns a lookup that never answered into a page
// full of products that no longer exist.

export type CartStatus =
  /** localStorage has not been read yet; nothing is known, not even how many lines. */
  | "loading"
  /** The lines are known, the catalog's answer is not yet. */
  | "checking"
  /** The lookup did not answer. Every line's state is unknown until it is retried. */
  | "failed"
  /** The lines have been checked against the catalog and may say so. */
  | "ready";

export interface CartLinesState {
  /** Reconciled while `status` is "ready"; the browser's own snapshot otherwise. */
  cart: ReconciledCart;
  status: CartStatus;
  /** A cart that has been read and holds nothing — not one that is still loading. */
  isEmpty: boolean;
  /** The first thing stopping the order, or null. Only meaningful once ready. */
  blocker: CartBlocker | null;
  canCheckout: boolean;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  /** Re-runs a lookup that failed. */
  retry: () => void;
}

export function useCartLines(): CartLinesState {
  const hydrate = useCartStore((state) => state.hydrate);
  const reconcile = useCartStore((state) => state.reconcile);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const lookupFailed = useCartStore((state) => state.lookupFailed);

  const cart = useCart();
  const isVerified = useCartVerified();

  // The cart belongs to the browser, not to the account, so it is read whether
  // or not anyone is signed in.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const retry = useCallback(() => {
    void reconcile();
  }, [reconcile]);

  const status: CartStatus = !hasHydrated
    ? "loading"
    : isVerified
      ? "ready"
      : lookupFailed
        ? "failed"
        : "checking";

  const blocker = status === "ready" ? cartBlocker(cart) : null;

  return {
    cart,
    status,
    isEmpty: status !== "loading" && cart.lines.length === 0,
    blocker,
    // An unchecked cart cannot be ordered either: checkout would be placing an
    // order on quantities and prices nothing has confirmed since they were stored.
    canCheckout: status === "ready" && cart.lines.length > 0 && blocker === null,
    setQuantity,
    removeItem,
    retry,
  };
}
