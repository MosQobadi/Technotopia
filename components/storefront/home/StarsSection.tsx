"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HomeProductView } from "@/types/home";
import { Button } from "@/components/storefront/ui/Button";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistHeart } from "@/lib/store/wishlist";

const COLLAPSED_COUNT = 4;
const EXPANDED_COUNT = 10;

export function StarsSection({ products }: { products: HomeProductView[] }) {
  const t = useTranslations("home.stars");
  const [expanded, setExpanded] = useState(false);
  const addCartItem = useCartStore((state) => state.addItem);
  // The hearts are this section's own concern, so is the list behind them.
  const heart = useWishlistHeart();

  if (products.length === 0) return null;

  const visible = products.slice(0, expanded ? EXPANDED_COUNT : COLLAPSED_COUNT);

  return (
    <section className="mx-auto max-w-320 px-6 pt-18 pb-10">
      <SectionEyebrow label={t("eyebrow")} />
      <h2 className="text-fg text-title mb-8">{t("heading")}</h2>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            href={`/products/${product.slug}`}
            category={product.category}
            name={product.name}
            price={product.price}
            originalPrice={product.originalPrice}
            discountPercent={product.discountPercent}
            imageSrc={product.image ?? undefined}
            badge={
              product.discountPercent > 0
                ? { kind: "discount", label: `-${product.discountPercent}%` }
                : undefined
            }
            wishlist={heart(product.id)}
            onAddToCart={() => addCartItem(product.id, product.price)}
          />
        ))}
      </div>

      {products.length > COLLAPSED_COUNT && (
        <div className="mt-9 flex justify-center">
          <Button variant="secondary" onClick={() => setExpanded((current) => !current)}>
            {expanded ? t("showLess") : t("showMore")}
          </Button>
        </div>
      )}
    </section>
  );
}
