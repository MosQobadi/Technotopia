"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useCartLines } from "@/components/storefront/cart/useCartLines";
import { CartLineRow } from "@/components/storefront/cart/CartLineRow";
import { Button } from "@/components/storefront/ui/Button";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { navTrail } from "@/components/storefront/navLinks";
import { formatPrice } from "@/lib/format";

// The cart screen. Everything it renders comes from `useCartLines`: the store
// holds what the customer added, the hook says how far that has been checked,
// and this composes the two. No arithmetic happens here — every figure below is
// one the pure module in `lib/storefront/cart.ts` computed and its tests cover.
//
// The cart lives in localStorage, so the server has nothing to render and the
// first client pass has to match that. Until it is read this is a placeholder,
// not an empty cart: telling a customer with four items that their cart is
// empty, even for one frame, is the one wrong thing this screen could say. The
// same rule governs the rest of the states — an unchecked cart shows lines
// without claims, and a lookup that failed says so rather than reporting every
// product as gone.

export function CartContent() {
  const t = useTranslations("cart");
  const tCommon = useTranslations("common");

  const { cart, status, isEmpty, blocker, canCheckout, setQuantity, removeItem, retry } =
    useCartLines();
  const { lines, subtotal, shipping, total } = cart;

  if (status === "loading") {
    return (
      <CartShell title={t("title")}>
        <p role="status" className="text-fg-subtle text-sm">
          {t("loading")}
        </p>
      </CartShell>
    );
  }

  if (status === "failed") {
    return (
      <CartShell title={t("title")}>
        {/* Assertive, unlike the line notes: this one appears in reaction to
            something the customer did not do and cannot see the cause of. */}
        <div role="alert" className="bg-danger-soft rounded-[20px] px-6 py-10 text-center">
          <p className="text-fg mx-auto mb-5 max-w-[46ch] text-sm">{t("lookupFailed")}</p>
          <Button variant="secondary" onClick={retry}>
            {t("retry")}
          </Button>
        </div>
      </CartShell>
    );
  }

  if (isEmpty) {
    return (
      <CartShell title={t("title")}>
        <EmptyState
          message={t("empty")}
          actionLabel={tCommon("browseProducts")}
          actionHref="/products"
        />
      </CartShell>
    );
  }

  // Known lines, unknown catalog. The rows are the browser's own snapshot, so
  // rather than print prices and stock nothing has confirmed, the page holds
  // their shape for the one round trip it takes to be able to mean them.
  if (status === "checking") {
    return (
      <CartShell title={t("title")}>
        <p role="status" className="text-fg-subtle mb-4 text-sm">
          {t("checking")}
        </p>
        <div className="flex flex-col gap-4">
          {lines.map((line) => (
            <div
              key={line.productId}
              aria-hidden="true"
              className="bg-surface-sunken flex animate-pulse gap-4 rounded-[20px] p-4"
            >
              <div className="bg-surface-muted size-24 shrink-0 rounded-[14px]" />
              <div className="flex flex-1 flex-col gap-2 pt-2">
                <div className="bg-surface-muted h-3 w-24 rounded-full" />
                <div className="bg-surface-muted h-4 w-2/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CartShell>
    );
  }

  return (
    <CartShell title={t("title")}>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-4">
          {lines.map((line) => (
            <CartLineRow
              key={line.productId}
              line={line}
              onDecrease={() => setQuantity(line.productId, line.quantity - 1)}
              onIncrease={() => setQuantity(line.productId, line.quantity + 1)}
              onRemove={() => removeItem(line.productId)}
            />
          ))}
        </ul>

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
              <CheckoutArrow />
            </Button>
          ) : (
            <Button variant="disabled" fullWidth disabled>
              {t("checkout")}
              <CheckoutArrow />
            </Button>
          )}

          {/* Disabled rather than hidden, and never without the reason beside
              it: a checkout button that simply stops working leaves the
              customer guessing which line the cart is waiting on. */}
          {blocker && (
            <p role="status" className="text-fg-muted mt-3 text-xs leading-relaxed">
              {t(`blocked.${blocker}`)}
            </p>
          )}
        </div>
      </div>
    </CartShell>
  );
}

// Out of the translated label, where it was part of the button's accessible name
// and read out as "right arrow" — and turned around with the reading direction
// here, the way the hero's CTA arrow is, instead of in each message file.
function CheckoutArrow() {
  return (
    <span aria-hidden className="rtl:-scale-x-100">
      →
    </span>
  );
}

function CartShell({ title, children }: { title: string; children: ReactNode }) {
  const tNav = useTranslations("nav");

  return (
    <main className="mx-auto max-w-250 px-6 py-10 pb-24">
      <Breadcrumb items={navTrail("cart", tNav)} className="mb-5" />
      <h1 className="text-fg text-title mb-8">{title}</h1>
      {children}
    </main>
  );
}
