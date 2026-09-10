import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  addToStoredCart,
  cartIdsKey,
  EMPTY_CART,
  pendingCart,
  reconcileCart,
  removeFromStoredCart,
  serializeCartIds,
  setStoredQuantity,
  type CartCatalogEntry,
  type ReconciledCart,
  type StoredCartItem,
} from "@/lib/storefront/cart";

interface CartState {
  /** The cart itself — persisted, and the only thing that survives a restart. */
  items: StoredCartItem[];
  /** The catalog's answer for those ids. Derived, never persisted. */
  entries: CartCatalogEntry[];
  /**
   * The ids `entries` actually answers for. Comparing it with the cart's own key
   * is what tells a reader whether the answer still covers the cart — see
   * `useCart`. Without it, "no entry for this id" and "no answer yet" are the
   * same shape, and a cart mid-lookup reports every product in it as gone.
   */
  entriesKey: string;
  isLoading: boolean;
  /**
   * The last lookup did not answer. The lines are unverified, not gone — nothing
   * may be said about their stock or price until one does, which is why this is
   * a fact of its own rather than an empty `entries`.
   */
  lookupFailed: boolean;
  /**
   * False until localStorage has been read back. Everything that renders a
   * count waits for it: the server has no localStorage, so a cart that appeared
   * on the first client render would not match the HTML React is hydrating.
   */
  hasHydrated: boolean;
  /**
   * A stamp bumped by `addItem` and by nothing else — the mini-cart's cue to
   * open. The count cannot be that cue: it also moves on a removal, and it does
   * not move at all when the line was already at the quantity ceiling, which is
   * exactly the add that most needs an answer on screen.
   */
  lastAddedAt: number | null;

  /** Read the stored cart, then reconcile it. Safe to call from every mounted consumer. */
  hydrate: () => Promise<void>;
  /** Re-read the catalog for the ids already stored — also how a failed lookup is retried. */
  reconcile: () => Promise<void>;
  addItem: (productId: string, unitPrice: number, quantity?: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "technotopia.cart";

/** The catalog's entries for these ids, or null when the lookup did not answer. */
async function fetchEntries(items: StoredCartItem[]): Promise<CartCatalogEntry[] | null> {
  const query = new URLSearchParams({ ids: serializeCartIds(items) });
  const response = await fetch(`/api/storefront/cart?${query}`).catch(() => null);
  if (!response) return null;

  const result = await response.json().catch(() => null);
  return result?.success ? (result.data.entries as CartCatalogEntry[]) : null;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      /** Ask the catalog about the cart as it now stands, and record what came back. */
      async function lookup(items: StoredCartItem[]) {
        if (items.length === 0) {
          set({ entries: [], entriesKey: "", isLoading: false, lookupFailed: false });
          return;
        }

        set({ isLoading: true, lookupFailed: false });
        const entries = await fetchEntries(items);
        if (entries) {
          set({ entries, entriesKey: cartIdsKey(items), isLoading: false, lookupFailed: false });
          return;
        }
        // `entriesKey` is left stale on purpose, so the cart goes on reading as
        // unverified instead of falling back on an answer to another question.
        set({ isLoading: false, lookupFailed: true });
      }

      /** True while `entries` answers for exactly the ids these items carry. */
      function covers(items: StoredCartItem[]): boolean {
        return cartIdsKey(items) === get().entriesKey;
      }

      return {
        items: [],
        entries: [],
        entriesKey: "",
        isLoading: false,
        lookupFailed: false,
        hasHydrated: false,
        lastAddedAt: null,

        hydrate: () => ensureHydrated(),

        reconcile: () => lookup(get().items),

        addItem: async (productId, unitPrice, quantity = 1) => {
          const items = addToStoredCart(
            get().items,
            productId,
            quantity,
            unitPrice,
            new Date().toISOString(),
          );
          set({ items, lastAddedAt: Date.now() });
          // Only a product the held answer does not already cover is worth asking about.
          if (!covers(items)) await lookup(items);
        },

        // A quantity is not something the catalog has an opinion about until
        // checkout, and the stock it was checked against has not moved — so this
        // asks nothing. Re-running the lookup here would blank every line's
        // state for the length of a round trip, on the one screen whose whole
        // job is to keep saying what is wrong with each line.
        setQuantity: (productId, quantity) => {
          set({ items: setStoredQuantity(get().items, productId, quantity) });
        },

        // Dropping a line cannot invalidate what was learned about the others,
        // so the held answer is pruned rather than thrown away. If it was not
        // covering the cart to begin with there is nothing to prune, and the
        // cart stays unverified until the next lookup.
        removeItem: (productId) => {
          const current = get().items;
          const items = removeFromStoredCart(current, productId);
          if (!covers(current)) {
            set({ items });
            return;
          }
          set({
            items,
            entries: get().entries.filter((entry) => entry.productId !== productId),
            entriesKey: cartIdsKey(items),
          });
        },

        clear: () =>
          set({
            items: [],
            entries: [],
            entriesKey: "",
            lookupFailed: false,
            lastAddedAt: null,
          }),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      // Rehydration is deferred to an effect rather than run at import time, so
      // the first client render matches the server's — see `hasHydrated`.
      skipHydration: true,
      // Only the cart is worth keeping; the catalog's answer is stale the moment
      // it is written, which is the whole reason reconciliation exists.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => () => useCartStore.setState({ hasHydrated: true }),
    },
  ),
);

// Several components mount at once on a storefront page and each asks for the
// cart; one read of localStorage and one catalog request is enough.
let hydration: Promise<void> | null = null;

function ensureHydrated(): Promise<void> {
  hydration ??= Promise.resolve(useCartStore.persist.rehydrate()).then(() =>
    useCartStore.getState().reconcile(),
  );
  return hydration;
}

/**
 * The cart as the UI reads it: the stored lines merged with the catalog by the
 * same rules the lookup route documents. Empty until localStorage has been read,
 * so server and client agree on the first paint — and merged only while the
 * catalog's answer covers the cart in hand. Until it does, the lines are the
 * browser's own snapshot with no claims attached: an answer to a different set
 * of ids is not evidence that these products are gone.
 */
export function useCart(): ReconciledCart {
  const items = useCartStore((state) => state.items);
  const entries = useCartStore((state) => state.entries);
  const entriesKey = useCartStore((state) => state.entriesKey);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  if (!hasHydrated) return EMPTY_CART;
  return cartIdsKey(items) === entriesKey ? reconcileCart(items, entries) : pendingCart(items);
}

/** True while what is on screen has been checked against the catalog. */
export function useCartVerified(): boolean {
  const items = useCartStore((state) => state.items);
  const entriesKey = useCartStore((state) => state.entriesKey);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  return hasHydrated && cartIdsKey(items) === entriesKey;
}
