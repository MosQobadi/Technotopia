"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCart, useCartStore } from "@/lib/store/cart";
import type { CartLine } from "@/lib/storefront/cart";
import { Button } from "@/components/storefront/ui/Button";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";
import { formatPrice } from "@/lib/format";

export function CartContent() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");

  const hydrateCart = useCartStore((state) => state.hydrate);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  const { lines, subtotal, shipping, total } = useCart();

  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  const isEmpty = hasHydrated && !isLoading && lines.length === 0;
  const canCheckout = lines.some((line) => line.orderableQuantity > 0);

  return (
    <main className="mx-auto max-w-250 px-6 py-10 pb-24">
      <h1 className="text-fg text-title mb-8">{t("title")}</h1>

      {isEmpty && (
        <EmptyState
          message={t("empty")}
          actionLabel={tCommon("browseProducts")}
          actionHref="/products"
        />
      )}

      {lines.length > 0 && (
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {lines.map((line) => (
              <CartLineRow
                key={line.productId}
                line={line}
                onDecrease={() => setQuantity(line.productId, line.quantity - 1)}
                onIncrease={() => setQuantity(line.productId, line.quantity + 1)}
                onRemove={() => removeItem(line.productId)}
              />
            ))}
          </div>

          <div className="bg-surface-sunken sticky top-22 rounded-[20px] p-6">
            <h2 className="text-fg text-subhead mb-5">{tCommon("orderSummary")}</h2>
            <div className="text-fg-subtle mb-2.5 flex justify-between text-sm">
              <span>{tCommon("subtotal")}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="text-fg-subtle mb-4 flex justify-between text-sm">
              <span>{tCommon("shipping")}</span>
              <span>{shipping > 0 ? formatPrice(shipping) : tCommon("free")}</span>
            </div>
            <div className="text-fg border-line mb-6 flex justify-between border-t pt-4 text-lg font-extrabold">
              <span>{tCommon("total")}</span>
              <span>{formatPrice(total)}</span>
            </div>
            {/* Without an href when there is nothing to buy — `disabled` greys a
                link but does not stop it navigating. */}
            {canCheckout ? (
              <Button variant="primary" href="/checkout" fullWidth>
                {t("checkout")}
              </Button>
            ) : (
              <Button variant="disabled" fullWidth disabled>
                {t("checkout")}
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

interface CartLineRowProps {
  line: CartLine;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

function CartLineRow({ line, onDecrease, onIncrease, onRemove }: CartLineRowProps) {
  const t = useTranslations("cart");
  const { product, issue } = line;

  return (
    <div className="bg-surface-sunken flex gap-4 rounded-[20px] p-4">
      <div className="bg-surface-muted relative size-24 shrink-0 overflow-hidden rounded-[14px]">
        {product?.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="text-fg-subtle flex size-full items-center justify-center text-[9px]">
            PHOTO
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-accent-readable text-[10px] tracking-wide uppercase">
          {product?.category ?? ""}
        </span>
        <h3 className="text-fg text-subhead">{product?.name ?? t("issue.goneProduct")}</h3>

        {issue && (
          <p
            role="status"
            className={
              issue === "priceChanged"
                ? "text-info text-xs font-semibold"
                : "text-danger text-xs font-semibold"
            }
          >
            {issue === "exceedsStock"
              ? t("issue.exceedsStock", { available: product?.stock ?? 0 })
              : issue === "priceChanged"
                ? t("issue.priceChanged", { price: formatPrice(product?.unitPrice ?? 0) })
                : t(`issue.${issue}`)}
          </p>
        )}

        <div className="mt-1.5 flex items-center justify-between">
          <QuantityStepper
            value={line.quantity}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            size="sm"
          />
          <span className="text-fg text-[16px] font-extrabold">{formatPrice(line.lineTotal)}</span>
        </div>
      </div>

      <button
        type="button"
        aria-label={t("removeItem")}
        onClick={onRemove}
        className="hover:text-danger focus-visible:outline-accent-readable text-fg-subtle flex size-7 shrink-0 items-center justify-center self-start rounded-full text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        ✕
      </button>
    </div>
  );
}
