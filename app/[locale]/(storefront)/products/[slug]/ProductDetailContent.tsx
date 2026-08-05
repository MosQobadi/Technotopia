"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { InventoryStatus } from "@/types/inventory";
import type { StorefrontProductDetail, StorefrontProductView } from "@/types/product";
import { formatPrice } from "@/lib/format";
import type { BreadcrumbTrailItem } from "@/lib/seo";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { Button } from "@/components/storefront/ui/Button";
import { PriceTag } from "@/components/storefront/ui/PriceTag";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { ProductGallery } from "@/components/storefront/ui/ProductGallery";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { StockStatusBadge } from "@/components/storefront/ui/StatusBadge";

interface ProductDetailContentProps {
  product: StorefrontProductDetail;
  related: StorefrontProductView[];
  breadcrumbItems: BreadcrumbTrailItem[];
}

const STOCK_STATUS: Record<InventoryStatus, "in-stock" | "low-stock" | "out-of-stock"> = {
  IN_STOCK: "in-stock",
  LOW_STOCK: "low-stock",
  OUT_OF_STOCK: "out-of-stock",
};

export function ProductDetailContent({
  product,
  related,
  breadcrumbItems,
}: ProductDetailContentProps) {
  const t = useTranslations("productDetail");
  const tCommon = useTranslations("common");
  const [quantity, setQuantity] = useState(1);

  const user = useAuthStore((state) => state.user);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateWishlist = useWishlistStore((state) => state.hydrate);
  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // `isWishlisted` itself is a stable function reference, so this component also has to
  // subscribe to `items` directly — otherwise it never re-renders when the wishlist changes.
  useWishlistStore((state) => state.items);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateWishlist();
  }, [user, hydrateWishlist]);

  return (
    <main className="mx-auto max-w-320 px-6 pt-10 pb-24">
      <Breadcrumb items={breadcrumbItems} className="mb-7" />

      <div className="mb-18 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.image ? [product.image] : []} alt={product.name} />

        <div>
          <div className="text-accent mb-2.5 font-mono text-xs tracking-wide uppercase">
            {product.category} · {product.brand}
          </div>
          <h1 className="text-ink-900 mb-3.5 text-[32px] font-extrabold tracking-tight">
            {product.name}
          </h1>
          <PriceTag
            price={product.price}
            originalPrice={product.originalPrice}
            size="lg"
            className="mb-2.5"
          />
          <StockStatusBadge status={STOCK_STATUS[product.stockStatus]} className="mb-6" />

          {product.tags.length > 0 && (
            <div className="mb-7 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 px-2.5 py-1 font-mono text-[11px] text-gray-600 uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mb-5 flex items-center gap-4">
            <QuantityStepper
              value={quantity}
              onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
              onIncrease={() => setQuantity((current) => current + 1)}
            />
            <span className="font-mono text-xs text-gray-500">
              {t("subtotal", { price: formatPrice(product.price * quantity) })}
            </span>
          </div>

          <div className="mb-9 flex gap-3.5">
            <Button variant="primary" fullWidth onClick={() => addCartItem(product.id, quantity)}>
              {tCommon("addToCart")}
            </Button>
            <Button
              variant="icon-circle"
              iconSize="md"
              aria-label={
                isWishlisted(product.id) ? tCommon("removeFromWishlist") : tCommon("addToWishlist")
              }
              onClick={() => toggleWishlist(product.id)}
              className="hover:text-error shrink-0"
            >
              {isWishlisted(product.id) ? "♥" : "♡"}
            </Button>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-ink-900 mb-3 text-[17px] font-bold">{t("description")}</h2>
            <p className="text-[15px] leading-relaxed text-gray-600">{product.longDescription}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <SectionEyebrow label={t("relatedEyebrow")} />
          <h2 className="text-ink-900 mb-6 text-[26px] font-extrabold tracking-tight">
            {t("relatedHeading")}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                href={`/products/${item.slug}`}
                category={item.brand}
                name={item.name}
                price={item.price}
                originalPrice={item.originalPrice}
                imageSrc={item.image ?? undefined}
                isWishlisted={isWishlisted(item.id)}
                onToggleWishlist={() => toggleWishlist(item.id)}
                onAddToCart={() => addCartItem(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
