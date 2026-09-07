"use client";

import { useTranslations } from "next-intl";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontProductView } from "@/types/product";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistHydration, useWishlistStore } from "@/lib/store/wishlist";

// The grid itself is only a client component because of the two buttons on each
// card — add-to-cart and the wishlist heart. The products arrive as props from
// the server page, already filtered, sorted and paged.

const STATUS_BADGE_TONE: Record<Exclude<InventoryStatus, "IN_STOCK">, "warning" | "error"> = {
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
};

interface ProductGridProps {
  products: StorefrontProductView[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const tStatus = useTranslations("common.stockStatus");

  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // `isWishlisted` is a stable function reference, so this component also has to
  // subscribe to `items` directly — otherwise it never re-renders when the
  // wishlist changes.
  useWishlistStore((state) => state.items);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  // The hearts are this grid's own concern, so is the list behind them.
  useWishlistHydration();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          href={`/products/${product.slug}`}
          category={product.brand}
          name={product.name}
          price={product.price}
          originalPrice={product.originalPrice}
          imageSrc={product.image ?? undefined}
          badge={
            product.stockStatus === "IN_STOCK"
              ? undefined
              : {
                  kind: "status",
                  label: tStatus(
                    product.stockStatus === "LOW_STOCK" ? "lowStock" : "outOfStock",
                  ).toUpperCase(),
                  tone: STATUS_BADGE_TONE[product.stockStatus],
                }
          }
          isWishlisted={isWishlisted(product.id)}
          onToggleWishlist={() => toggleWishlist(product.id)}
          onAddToCart={() => addCartItem(product.id)}
        />
      ))}
    </div>
  );
}
