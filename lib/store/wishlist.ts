import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { create } from "zustand";
import { usePathname, useRouter } from "@/i18n/navigation";
import { requestFailure } from "@/lib/storefront/form-errors";
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
  /** The discount the admin set. 0 when the product is not discounted. */
  discountPercent: number;
}

/** How a save or an unsave came back. "unauthorized": nobody is signed in to save it for. */
export type WishlistToggle = "done" | "unauthorized" | "failed";

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  /** Resolves to the list the server has left, or null if the delete failed. */
  removeItem: (productId: string) => Promise<WishlistItem[] | null>;
  toggle: (productId: string) => Promise<WishlistToggle>;
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

/**
 * One write to the wishlist API. A request that never arrives resolves like one
 * the server refused — `items` null, never a rejection — and `status` is what
 * tells the two apart: undefined when there was no response at all.
 */
async function writeWishlist(
  url: string,
  init: RequestInit,
): Promise<{ status: number | undefined; items: WishlistItem[] | null }> {
  const response = await fetch(url, init).catch(() => null);
  return {
    status: response?.status,
    items: response ? await parseWishlistResponse(response) : null,
  };
}

function isSaved(items: WishlistItem[], productId: string): boolean {
  return items.some((item) => item.productId === productId);
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

  removeItem: async (productId) => {
    const { items } = await writeWishlist(`/api/storefront/wishlist/${productId}`, {
      method: "DELETE",
    });
    if (items) set({ items });
    // Returned as well as stored: the wishlist page renders the server's copy
    // of this list rather than subscribing to the store (see WishlistGrid), and
    // this response is what tells it the row is gone.
    return items;
  },

  toggle: async (productId) => {
    const { status, items } = isSaved(get().items, productId)
      ? await writeWishlist(`/api/storefront/wishlist/${productId}`, { method: "DELETE" })
      : await writeWishlist("/api/storefront/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
    if (items) {
      set({ items });
      return "done";
    }
    return requestFailure(status, ["unauthorized"]);
  },
}));

/** Loads the signed-in customer's wishlist; does nothing while nobody is signed in. */
function useWishlistHydration() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useWishlistStore((state) => state.hydrate);

  useEffect(() => {
    if (user) hydrate();
  }, [user, hydrate]);
}

/** Everything one heart needs: whether it is filled, what it is called, and what pressing it does. */
export interface WishlistHeart {
  isWishlisted: boolean;
  label: string;
  toggle: () => void;
}

/**
 * The hearts on product cards and on the product page, for any product. Call it
 * from the component that draws them — a Server Component page above cannot, and
 * a client wrapper added only to hold it would put the whole page back on the
 * client. It loads the wishlist, and it subscribes to the list itself, so every
 * heart it describes re-renders when an item is saved or removed.
 *
 * Signed out, a heart still means "save this" — the designs draw it on every
 * card — but there is no account to save to. So its name says so, and pressing
 * it goes to the login page with the way back to this one. A 401 goes to the
 * same place: the navbar's view of the session can outlive the cookie, and until
 * it has answered at all a press is simply tried.
 */
export function useWishlistHeart(): (productId: string) => WishlistHeart {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const items = useWishlistStore((state) => state.items);
  const toggle = useWishlistStore((state) => state.toggle);
  const isSignedOut = useAuthStore((state) => !state.isLoading && state.user === null);

  useWishlistHydration();

  function logIn() {
    // The locale-free path plus the query, read at press time: useSearchParams
    // would oblige the statically rendered product page to wrap every heart in
    // a Suspense boundary. The router puts the reader's locale back on.
    router.push({ pathname: "/login", query: { next: `${pathname}${window.location.search}` } });
  }

  return (productId) => {
    const isWishlisted = isSaved(items, productId);
    return {
      isWishlisted,
      label: isWishlisted
        ? t("removeFromWishlist")
        : isSignedOut
          ? t("logInToSave")
          : t("addToWishlist"),
      toggle: () => {
        if (isSignedOut) return logIn();
        void toggle(productId).then((outcome) => {
          if (outcome === "unauthorized") logIn();
        });
      },
    };
  };
}
