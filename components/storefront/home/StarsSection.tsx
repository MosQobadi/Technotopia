"use client";

import { useState } from "react";
import type { HomeProductView } from "@/types/home";
import { Button } from "@/components/storefront/ui/Button";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";

const COLLAPSED_COUNT = 4;
const EXPANDED_COUNT = 10;

export function StarsSection({ products }: { products: HomeProductView[] }) {
  const [expanded, setExpanded] = useState(false);
  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  if (products.length === 0) return null;

  const visible = products.slice(0, expanded ? EXPANDED_COUNT : COLLAPSED_COUNT);

  return (
    <section className="mx-auto max-w-320 px-6 pt-18 pb-10">
      <SectionEyebrow label="The Stars" />
      <h2 className="mb-8 text-[32px] font-extrabold tracking-tight text-ink-900">
        Gear that gets all the attention.
      </h2>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
        {visible.map((product) => {
          const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
          const discountPercent = hasDiscount
            ? Math.round((1 - product.price / product.originalPrice!) * 100)
            : null;

          return (
            <ProductCard
              key={product.id}
              href={`/products/${product.slug}`}
              category={product.category}
              name={product.name}
              price={product.price}
              originalPrice={product.originalPrice}
              imageSrc={product.image ?? undefined}
              badge={hasDiscount ? { kind: "discount", label: `-${discountPercent}%` } : undefined}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={() => toggleWishlist(product.id)}
              onAddToCart={() => addCartItem(product.id)}
            />
          );
        })}
      </div>

      {products.length > COLLAPSED_COUNT && (
        <div className="mt-9 flex justify-center">
          <Button variant="secondary" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Show Less" : "Show More"}
          </Button>
        </div>
      )}
    </section>
  );
}
