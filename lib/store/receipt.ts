import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlacedOrder } from "@/lib/storefront/checkout";

// A guest's receipt, handed from the checkout screen to the confirmation screen.
//
// A guest has no order history and no order page they can open, so this is the
// only copy they get: the order POST's own response, nothing re-read. It lives in
// sessionStorage rather than localStorage so that reloading the receipt still
// works, but whoever opens the browser next does not find it. A signed-in
// customer never needs it — their receipt is a page they can open again.
interface ReceiptState {
  receipt: PlacedOrder | null;
  /** False until sessionStorage has been read back — see the cart store's `hasHydrated`. */
  hasHydrated: boolean;
  setReceipt: (receipt: PlacedOrder) => void;
  hydrate: () => void;
}

export const useReceiptStore = create<ReceiptState>()(
  persist(
    (set) => ({
      receipt: null,
      hasHydrated: false,
      setReceipt: (receipt) => set({ receipt }),
      hydrate: () => {
        void useReceiptStore.persist.rehydrate();
      },
    }),
    {
      name: "technotopia.receipt",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Deferred to an effect, so the first client render matches the server's.
      skipHydration: true,
      partialize: (state) => ({ receipt: state.receipt }),
      onRehydrateStorage: () => () => useReceiptStore.setState({ hasHydrated: true }),
    },
  ),
);
