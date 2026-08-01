import { create } from "zustand";

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

interface CartView {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

interface CartState extends CartView {
  isLoading: boolean;
  hydrate: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

const EMPTY_CART: CartView = { items: [], subtotal: 0, shipping: 0, total: 0 };

async function parseCartResponse(response: Response): Promise<CartView | null> {
  const result = await response.json().catch(() => null);
  return result?.success ? (result.data as CartView) : null;
}

export const useCartStore = create<CartState>((set) => ({
  ...EMPTY_CART,
  isLoading: true,

  hydrate: async () => {
    set({ isLoading: true });
    const response = await fetch("/api/storefront/cart").catch(() => null);
    const cart = response ? await parseCartResponse(response) : null;
    set({ ...(cart ?? EMPTY_CART), isLoading: false });
  },

  addItem: async (productId, quantity = 1) => {
    const response = await fetch("/api/storefront/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const cart = await parseCartResponse(response);
    if (cart) set(cart);
  },

  updateQuantity: async (itemId, quantity) => {
    const response = await fetch(`/api/storefront/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    const cart = await parseCartResponse(response);
    if (cart) set(cart);
  },

  removeItem: async (itemId) => {
    const response = await fetch(`/api/storefront/cart/${itemId}`, { method: "DELETE" });
    const cart = await parseCartResponse(response);
    if (cart) set(cart);
  },
}));
