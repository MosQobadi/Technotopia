"use client";

import { useTranslations } from "next-intl";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontProductView } from "@/types/product";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistHeart } from "@/lib/store/wishlist";

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
  // The hearts are this grid's own concern, so is the list behind them.
  const heart = useWishlistHeart();

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
          discountPercent={product.discountPercent}
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
          wishlist={heart(product.id)}
          onAddToCart={() => addCartItem(product.id, product.price)}
        />
      ))}
    </div>
  );
}
