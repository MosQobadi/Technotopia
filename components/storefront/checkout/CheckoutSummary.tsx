"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CartStatus } from "@/components/storefront/cart/useCartLines";
import { Button } from "@/components/storefront/ui/Button";
import { formatPrice } from "@/lib/format";
import type { CartBlocker, ReconciledCart } from "@/lib/storefront/cart";
import { checkoutSummaryLines, type CheckoutFailure } from "@/lib/storefront/checkout";

// The order summary and the button that places the order.
//
// Its figures are the cart's, and it prints them only once the catalog has
// answered for every line. Before that the cart is the browser's own snapshot,
// and a total built from prices nobody has confirmed is exactly the number that
// would then disagree with the one the order stores. Every other state says why
// the button is not live yet, next to the button.

interface CheckoutSummaryProps {
  cart: ReconciledCart;
  status: CartStatus;
  blocker: CartBlocker | null;
  canSubmit: boolean;
  submitting: boolean;
  failure: CheckoutFailure | null;
  onRetry: () => void;
}

export function CheckoutSummary({
  cart,
  status,
  blocker,
  canSubmit,
  submitting,
  failure,
  onRetry,
}: CheckoutSummaryProps) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");

  return (
    <div className="bg-surface-sunken sticky top-22 rounded-[20px] p-6">
      <h2 className="text-fg text-subhead mb-5">{tCommon("orderSummary")}</h2>

      {status === "ready" ? (
        <>
          <ul className="mb-2.5 flex flex-col gap-2.5">
            {checkoutSummaryLines(cart).map((line) => (
              <li
                key={line.productId}
                className="text-fg-subtle flex justify-between gap-4 text-[13px]"
              >
                <span>
                  {line.name} × {line.quantity}
                </span>
                <span className="shrink-0">{formatPrice(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="border-line text-fg-subtle mt-2.5 flex justify-between border-t pt-4 text-sm">
            <span>{tCommon("subtotal")}</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          <div className="text-fg-subtle mb-4 flex justify-between text-sm">
            <span>{tCommon("shipping")}</span>
            <span>{cart.shipping > 0 ? formatPrice(cart.shipping) : tCommon("free")}</span>
          </div>
          <div className="text-fg border-line mb-6 flex justify-between border-t pt-4 text-lg font-extrabold">
            <span>{tCommon("total")}</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
        </>
      ) : status === "failed" ? (
        <div role="alert" className="mb-6">
          <p className="text-fg mb-4 text-sm">{tCart("lookupFailed")}</p>
          <Button variant="secondary" onClick={onRetry}>
            {tCart("retry")}
          </Button>
        </div>
      ) : (
        <p role="status" className="text-fg-subtle mb-6 text-sm">
          {tCart("checking")}
        </p>
      )}

      <Button
        type="submit"
        variant={canSubmit ? "primary" : "disabled"}
        fullWidth
        disabled={!canSubmit || submitting}
      >
        {submitting ? t("placingOrder") : t("placeOrder")}
      </Button>

      {/* Every fix for a blocked line lives on the cart page, so the reason
          carries the way back there. */}
      {blocker && (
        <p role="status" className="text-fg-muted mt-3 text-xs leading-relaxed">
          {tCart(`blocked.${blocker}`)} <CartLink>{t("backToCart")}</CartLink>
        </p>
      )}

      {failure && (
        <p
          role="alert"
          className="bg-danger-soft text-danger mt-3 rounded-2xl px-4 py-3 text-sm leading-relaxed"
        >
          {t(`failure.${failure}`)}
        </p>
      )}
    </div>
  );
}

function CartLink({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/cart"
      className="text-accent-readable focus-visible:outline-accent-readable rounded font-semibold underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
    </Link>
  );
}
