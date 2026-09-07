"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore, type WishlistItem } from "@/lib/store/wishlist";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { ProductCard } from "@/components/storefront/ui/ProductCard";

interface WishlistGridProps {
  /** Read on the server by app/[locale]/(storefront)/wishlist/page.tsx. */
  initialItems: WishlistItem[];
}

/**
 * The saved items, rendered from what the server already sent. The store is
 * still the thing that *removes* an item — the hearts drawn on other screens
 * read from it — but this grid holds its own copy rather than subscribing to
 * it: the store is a module singleton, and seeding a singleton during a server
 * render is how one visitor's wishlist ends up in another's HTML.
 */
export function WishlistGrid({ initialItems }: WishlistGridProps) {
  const t = useTranslations("wishlist");
  const tCommon = useTranslations("common");

  const [items, setItems] = useState(initialItems);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const addCartItem = useCartStore((state) => state.addItem);

  async function handleRemove(productId: string) {
    const remaining = await removeItem(productId);
    if (remaining) setItems(remaining);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message={t("empty")}
        actionLabel={tCommon("browseProducts")}
        actionHref="/products"
      />
    );
  }

  return (
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
          onRemove={() => handleRemove(item.productId)}
          onAddToCart={() => addCartItem(item.productId)}
        />
      ))}
    </div>
  );
}
