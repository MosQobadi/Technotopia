"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/format";
import { useDismissable } from "@/lib/storefront/useDismissable";
import { useCart, useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/storefront/ui/Button";
import { HeaderIconButton } from "@/components/storefront/ui/HeaderIconButton";
import { CartIcon } from "@/components/storefront/ui/NavIcons";

// The header's answer to "did that work?".
//
// Adding from a product card used to change nothing a customer was looking at:
// the count in the corner moved by one, several hundred pixels away from the
// button they pressed. So the store bumps `lastAddedAt` on an add and this
// panel opens on it — the feedback and the summary are the same object, and
// nothing navigates.
//
// It is a summary, not a second cart page. Quantity and unit price per line,
// the reconciled subtotal, and a link — every line is editable one predictable
// step away, at every width, and the cart page is where a line explains itself.
// That is also why no per-line total is printed here: `lineTotal` is what can
// actually ship, which for a line whose stock has fallen is not quantity times
// price, and a mini-cart is the wrong place to open that conversation.

/** Lines the panel shows in full before it starts counting the rest. */
const VISIBLE_LINES = 3;

const BADGE_CEILING = 99;

export function MiniCart() {
  const t = useTranslations("cart");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const hydrateCart = useCartStore((state) => state.hydrate);
  const { lines, itemCount, subtotal } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);

  // The cart belongs to the browser, not the account, so it is read whether or
  // not anyone is signed in.
  useEffect(() => {
    hydrateCart();
  }, [hydrateCart]);

  // Subscribed to rather than read as a value: the panel opens as a *reaction*
  // to the store changing, and rendering on `lastAddedAt` and then opening in an
  // effect would be a second render chasing the first.
  useEffect(
    () =>
      useCartStore.subscribe((state, previous) => {
        if (state.lastAddedAt !== previous.lastAddedAt) setIsOpen(true);
      }),
    [],
  );

  useDismissable(containerRef, isOpen, close);

  // Newest first: the thing just added is the thing the panel opened to show.
  const visible = useMemo(() => [...lines].reverse().slice(0, VISIBLE_LINES), [lines]);
  const hiddenCount = lines.length - visible.length;

  return (
    <div ref={containerRef} className="relative">
      <HeaderIconButton
        label={tNav("cart")}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="mini-cart-panel"
      >
        <CartIcon />
        {itemCount > 0 && (
          <span className="bg-accent text-accent-foreground absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
            {itemCount > BADGE_CEILING ? `${BADGE_CEILING}+` : itemCount}
          </span>
        )}
      </HeaderIconButton>

      {/* The badge is a number in a corner; this is the same fact said out loud.
          It sits outside the panel so it is announced on an add whether or not
          the panel is the thing that opened. */}
      <p className="sr-only" aria-live="polite">
        {t("itemCount", { count: itemCount })}
      </p>

      {isOpen && (
        <div
          id="mini-cart-panel"
          role="dialog"
          aria-label={t("title")}
          className="border-line bg-surface absolute end-0 top-full z-30 mt-2 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border p-4 shadow-lg"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-fg text-subhead">{t("title")}</h2>
            <span className="text-fg-subtle text-xs">{t("itemCount", { count: itemCount })}</span>
          </div>

          {lines.length === 0 ? (
            <>
              <p className="text-fg-subtle mb-4 text-sm">{t("empty")}</p>
              <Button variant="primary" href="/products" fullWidth onClick={close}>
                {tCommon("browseProducts")}
              </Button>
            </>
          ) : (
            <>
              <ul className="mb-3 flex flex-col gap-3">
                {visible.map((line) => (
                  <li key={line.productId} className="flex items-center gap-3">
                    <div className="bg-surface-muted relative size-12 shrink-0 overflow-hidden rounded-xl">
                      {line.product?.image && (
                        <Image
                          src={line.product.image}
                          alt={line.product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-fg truncate text-sm font-bold">
                        {line.product?.name ?? t("issue.goneProduct")}
                      </span>
                      <span className="text-fg-subtle text-xs">
                        {line.quantity} ×{" "}
                        {formatPrice(line.product?.unitPrice ?? line.capturedPrice)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {hiddenCount > 0 && (
                <p className="text-fg-subtle mb-3 text-xs">
                  {t("moreLines", { count: hiddenCount })}
                </p>
              )}

              <div className="border-line text-fg mb-4 flex justify-between border-t pt-3 text-sm font-extrabold">
                <span>{tCommon("subtotal")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <Button variant="primary" href="/cart" fullWidth onClick={close}>
                {t("viewCart")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
