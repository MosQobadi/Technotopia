import { create } from "zustand";
import type { SafeUser } from "@/types/auth";

interface AuthState {
  user: SafeUser | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/auth/me");
      const result = await response.json();
      set({ user: result.success ? result.data : null, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
    window.location.href = "/admin/login";
  },
}));
