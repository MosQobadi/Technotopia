import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  addToStoredCart,
  EMPTY_CART,
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
  isLoading: boolean;
  /**
   * False until localStorage has been read back. Everything that renders a
   * count waits for it: the server has no localStorage, so a cart that appeared
   * on the first client render would not match the HTML React is hydrating.
   */
  hasHydrated: boolean;

  /** Read the stored cart, then reconcile it. Safe to call from every mounted consumer. */
  hydrate: () => Promise<void>;
  /** Re-read the catalog for the ids already stored. */
  reconcile: () => Promise<void>;
  addItem: (productId: string, unitPrice: number, quantity?: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => void;
}

const STORAGE_KEY = "technotopia.cart";

async function fetchEntries(items: StoredCartItem[]): Promise<CartCatalogEntry[]> {
  if (items.length === 0) return [];

  const query = new URLSearchParams({ ids: serializeCartIds(items) });
  const response = await fetch(`/api/storefront/cart?${query}`).catch(() => null);
  if (!response) return [];

  const result = await response.json().catch(() => null);
  return result?.success ? (result.data.entries as CartCatalogEntry[]) : [];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      /** Every mutation writes the list, then re-reads it against the catalog. */
      async function commit(items: StoredCartItem[]) {
        set({ items, isLoading: true });
        set({ entries: await fetchEntries(items), isLoading: false });
      }

      return {
        items: [],
        entries: [],
        isLoading: false,
        hasHydrated: false,

        hydrate: () => ensureHydrated(),

        reconcile: async () => {
          const { items } = get();
          if (items.length === 0) {
            set({ entries: [], isLoading: false });
            return;
          }
          set({ isLoading: true });
          set({ entries: await fetchEntries(items), isLoading: false });
        },

        addItem: async (productId, unitPrice, quantity = 1) => {
          await commit(
            addToStoredCart(get().items, productId, quantity, unitPrice, new Date().toISOString()),
          );
        },

        setQuantity: async (productId, quantity) => {
          await commit(setStoredQuantity(get().items, productId, quantity));
        },

        removeItem: async (productId) => {
          await commit(removeFromStoredCart(get().items, productId));
        },

        clear: () => set({ items: [], entries: [] }),
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
 * so server and client agree on the first paint.
 */
export function useCart(): ReconciledCart {
  const items = useCartStore((state) => state.items);
  const entries = useCartStore((state) => state.entries);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  return hasHydrated ? reconcileCart(items, entries) : EMPTY_CART;
}
