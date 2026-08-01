import { create } from "zustand";

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

async function parseWishlistResponse(response: Response): Promise<WishlistItem[] | null> {
  const result = await response.json().catch(() => null);
  return result?.success ? (result.data as WishlistItem[]) : null;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: true,

  hydrate: async () => {
    set({ isLoading: true });
    const response = await fetch("/api/storefront/wishlist").catch(() => null);
    const items = response ? await parseWishlistResponse(response) : null;
    set({ items: items ?? [], isLoading: false });
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
