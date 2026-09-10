"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import {
  lineCeiling,
  MAX_CART_ITEMS,
  pdpAddLimit,
  pdpSelection,
  type AddBlocker,
} from "@/lib/storefront/cart";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistHydration, useWishlistStore } from "@/lib/store/wishlist";
import { HeartIcon } from "@/components/storefront/icons";
import { Button } from "@/components/storefront/ui/Button";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";
import { NotifyMeForm } from "./NotifyMeForm";

// The only interactive strip of the product detail page. Everything around it —
// name, price, stock badge, tags, description, breadcrumbs — is rendered on the
// server, so this component gets the fields it actually needs rather than the row.
//
// Every inventory state has its own control, and none of them is a button that
// does nothing (`pdpAddLimit` decides which applies):
// - buyable: a stepper that stops at what the shelf holds less what the cart
//   already has, and Add to Cart;
// - out of stock: a disabled button saying so, the reason, and the notify-me form;
// - all of it already in the cart, or a cart with no room for another product:
//   a disabled button, the sentence saying which, and the way to the cart.
//
// `stock` comes from a page cached for up to five minutes. A sale in that window
// can leave it high; the cart re-reads stock live and flags a line it cannot fill.

interface ProductPurchasePanelProps {
  productId: string;
  slug: string;
  price: number;
  stock: number;
}

export function ProductPurchasePanel({ productId, slug, price, stock }: ProductPurchasePanelProps) {
  const t = useTranslations("productDetail");
  const tCommon = useTranslations("common");
  const reasonId = useId();
  const [quantity, setQuantity] = useState(1);

  const items = useCartStore((state) => state.items);
  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  // `isWishlisted` is a stable function reference, so this component also has to
  // subscribe to `items` directly — otherwise the heart never re-renders when the
  // wishlist changes.
  useWishlistStore((state) => state.items);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  // The heart is this panel's own concern, so is the list behind it.
  useWishlistHydration();

  const { inCart, max, blocker } = pdpAddLimit(stock, items, productId);
  // The ceiling can fall under the chosen quantity — an add from this page, or
  // from another tab — so the stepper shows what can still be added, never more.
  const { quantity: value, subtotal } = pdpSelection(quantity, max, price);

  const handleAdd = () => {
    addCartItem(productId, price, value);
    setQuantity(1);
  };

  const reasons: Record<AddBlocker, string> = {
    outOfStock: t("blocked.outOfStock"),
    allInCart: t("blocked.allInCart", { count: lineCeiling(stock) }),
    cartFull: t("blocked.cartFull", { count: MAX_CART_ITEMS }),
  };

  return (
    <div className="mb-9">
      {blocker === null && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <QuantityStepper
            value={value}
            onDecrease={() => setQuantity(value - 1)}
            onIncrease={() => setQuantity(value + 1)}
            max={max}
          />
          <span className="text-xs text-fg-subtle">
            {t("subtotal", { price: formatPrice(subtotal) })}
          </span>
          {/* Why the stepper may stop short of the badge's number. */}
          {inCart > 0 && (
            <span className="text-xs text-fg-subtle">{t("inCart", { count: inCart })}</span>
          )}
        </div>
      )}

      <div className="flex gap-3.5">
        <Button
          variant={blocker ? "disabled" : "primary"}
          fullWidth
          onClick={blocker ? undefined : handleAdd}
          aria-describedby={blocker ? reasonId : undefined}
        >
          {blocker === "outOfStock" ? tCommon("stockStatus.outOfStock") : tCommon("addToCart")}
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
          <HeartIcon className="size-5" fill={isWishlisted(productId) ? "currentColor" : "none"} />
        </Button>
      </div>

      {blocker && (
        <p id={reasonId} className="mt-4 text-sm text-fg-muted">
          {reasons[blocker]}
          {blocker !== "outOfStock" && (
            <>
              {" "}
              <Link
                href="/cart"
                className="text-accent-readable focus-visible:outline-accent-readable rounded font-semibold outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t("viewCart")}
              </Link>
            </>
          )}
        </p>
      )}

      {blocker === "outOfStock" && (
        <div className="mt-4">
          <NotifyMeForm slug={slug} />
        </div>
      )}
    </div>
  );
}
