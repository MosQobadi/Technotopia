import { useEffect } from "react";
import { create } from "zustand";
import { useAuthStore } from "./auth";

export interface WishlistItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  price: number;
  originalPrice?: number;
}

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
}

// The hearts on a page are spread across sections that no longer share a client
// parent — the home page above them is a Server Component — so each section
// hydrates for itself. Callers that arrive while a fetch is already open join it
// instead of firing a second identical request.
let inFlight: Promise<void> | null = null;

async function parseWishlistResponse(response: Response): Promise<WishlistItem[] | null> {
  const result = await response.json().catch(() => null);
  return result?.success ? (result.data as WishlistItem[]) : null;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: true,

  hydrate: () => {
    if (!inFlight) {
      inFlight = (async () => {
        set({ isLoading: true });
        const response = await fetch("/api/storefront/wishlist").catch(() => null);
        const items = response ? await parseWishlistResponse(response) : null;
        set({ items: items ?? [], isLoading: false });
      })().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  },

  addItem: async (productId) => {
    const response = await fetch("/api/storefront/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const items = await parseWishlistResponse(response);
    if (items) set({ items });
  },

  removeItem: async (productId) => {
    const response = await fetch(`/api/storefront/wishlist/${productId}`, { method: "DELETE" });
    const items = await parseWishlistResponse(response);
    if (items) set({ items });
  },

  toggle: async (productId) => {
    if (get().isWishlisted(productId)) {
      await get().removeItem(productId);
    } else {
      await get().addItem(productId);
    }
  },

  isWishlisted: (productId) => get().items.some((item) => item.productId === productId),
}));

/**
 * Loads the signed-in customer's wishlist. Call it from the component that
 * actually renders hearts rather than from the page above it: a Server
 * Component page cannot run it, and a client wrapper added just to hold it
 * would put the whole page back on the client.
 */
export function useWishlistHydration() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useWishlistStore((state) => state.hydrate);

  useEffect(() => {
    if (user) hydrate();
  }, [user, hydrate]);
}
