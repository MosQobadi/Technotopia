"use client";

import { useCallback, useEffect } from "react";
import { useCart, useCartStore, useCartVerified } from "@/lib/store/cart";
import {
  cartScreenState,
  type CartScreenState,
  type ReconciledCart,
} from "@/lib/storefront/cart";

// The cart page's data layer, kept out of the page itself: the store holds what
// the customer added, the lookup says what the catalog makes of it now, and
// `CartContent` only composes the two. This file only wires the store up — the
// question "what may this screen claim right now?" is answered by
// `cartScreenState` in lib/storefront/cart.ts, which is where its tests are.

export interface CartLinesState extends CartScreenState {
  /** Reconciled while `status` is "ready"; the browser's own snapshot otherwise. */
  cart: ReconciledCart;
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

  return {
    cart,
    ...cartScreenState(cart, { hasHydrated, isVerified, lookupFailed }),
    setQuantity,
    removeItem,
    retry,
  };
}
