"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { ProductCard } from "@/components/storefront/ui/ProductCard";

export default function WishlistPage() {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  const items = useWishlistStore((state) => state.items);
  const wishlistLoading = useWishlistStore((state) => state.isLoading);
  const hydrateWishlist = useWishlistStore((state) => state.hydrate);
  const removeItem = useWishlistStore((state) => state.removeItem);

  const addCartItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateWishlist();
  }, [user, hydrateWishlist]);

  const showLoggedOut = !authLoading && !user;
  const showEmpty = !authLoading && !!user && !wishlistLoading && items.length === 0;
  const showItems = !authLoading && !!user && (wishlistLoading || items.length > 0);

  return (
    <main className="mx-auto max-w-320 px-6 py-10 pb-24">
      <h1 className="mb-8 text-[32px] font-extrabold tracking-tight text-ink-900">Your Wishlist</h1>

      {showLoggedOut && (
        <EmptyState message="Log in to view your wishlist." actionLabel="Log In" actionHref="/login" />
      )}

      {showEmpty && (
        <EmptyState
          message="You haven't saved anything yet."
          actionLabel="Browse products"
          actionHref="/products"
        />
      )}

      {showItems && items.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              href={`/products/${item.slug}`}
              category={item.category}
              name={item.name}
              price={item.price}
              originalPrice={item.originalPrice}
              imageSrc={item.image ?? undefined}
              onRemove={() => removeItem(item.productId)}
              onAddToCart={() => addCartItem(item.productId)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
