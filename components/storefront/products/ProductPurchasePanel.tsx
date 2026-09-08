"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistHydration, useWishlistStore } from "@/lib/store/wishlist";
import { Button } from "@/components/storefront/ui/Button";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";

// The only interactive strip of the product detail page. Everything around it —
// name, price, stock, tags, description, breadcrumbs — is rendered on the server,
// so this component gets the two fields it actually needs rather than the row.

interface ProductPurchasePanelProps {
  productId: string;
  price: number;
}

export function ProductPurchasePanel({ productId, price }: ProductPurchasePanelProps) {
  const t = useTranslations("productDetail");
  const tCommon = useTranslations("common");
  const [quantity, setQuantity] = useState(1);

  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // `isWishlisted` is a stable function reference, so this component also has to
  // subscribe to `items` directly — otherwise the heart never re-renders when the
  // wishlist changes.
  useWishlistStore((state) => state.items);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  // The heart is this panel's own concern, so is the list behind it.
  useWishlistHydration();

  return (
    <>
      <div className="mb-5 flex items-center gap-4">
        <QuantityStepper
          value={quantity}
          onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
          onIncrease={() => setQuantity((current) => current + 1)}
        />
        <span className="text-xs text-fg-subtle">
          {t("subtotal", { price: formatPrice(price * quantity) })}
        </span>
      </div>

      <div className="mb-9 flex gap-3.5">
        <Button variant="primary" fullWidth onClick={() => addCartItem(productId, price, quantity)}>
          {tCommon("addToCart")}
        </Button>
        <Button
          variant="icon-circle"
          iconSize="md"
          aria-label={
            isWishlisted(productId) ? tCommon("removeFromWishlist") : tCommon("addToWishlist")
          }
          onClick={() => toggleWishlist(productId)}
          className="hover:text-danger shrink-0"
        >
          {isWishlisted(productId) ? "♥" : "♡"}
        </Button>
      </div>
    </>
  );
}
