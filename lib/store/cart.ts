import { create } from "zustand";

interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

/**
 * Placeholder shape for Task 15.4, which adds the API-backed read/write logic
 * (DB cart for logged-in users, guest merge-on-login). For now this only
 * exists so the navbar badge (Task 15.3) has an item count to read.
 */
export const useCartStore = create<CartState>(() => ({
  items: [],
}));
