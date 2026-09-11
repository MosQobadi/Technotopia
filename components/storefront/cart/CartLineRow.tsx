"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CloseIcon } from "@/components/storefront/icons";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { lineCeiling, lineUnitPrice, type CartIssue, type CartLine } from "@/lib/storefront/cart";

// One line of the cart, rendering the state it is actually in.
//
// Everything it knows arrives as a prop — the store writes live in the page —
// so each of the five states a line can be in is reachable without a browser.
// The line does not decide what is wrong with it either: `line.issue` was
// settled by the pure module the totals come from, and this only chooses how to
// say it, which is what keeps the sentence under the row and the number in the
// summary from ever disagreeing.
//
// Two of the five ship nothing at all: `unavailable` and `outOfStock` contribute
// zero to the subtotal, so the row prints "Not included" where its money would
// be and drops the stepper — there is no quantity of them to choose, and remove
// is the only move left. `exceedsStock` is different in kind: it still ships
// what is on the shelf, so the stepper stays and the total is the part that can
// go. `priceChanged` blocks nothing; checkout settles the price server-side.

/** How a line's note reads. Ordered by how much it stands between cart and order. */
const NOTE_TONE: Record<CartIssue, string> = {
  unavailable: "text-danger",
  outOfStock: "text-danger",
  exceedsStock: "text-warning",
  priceChanged: "text-info",
};

interface CartLineRowProps {
  line: CartLine;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export function CartLineRow({ line, onDecrease, onIncrease, onRemove }: CartLineRowProps) {
  const t = useTranslations("cart");
  const { product, issue, quantity, orderableQuantity } = line;

  // A line that ships nothing has no quantity worth choosing; removing it is the
  // only thing left to do, so it is the only control offered.
  const shipsNothing = orderableQuantity === 0;
  const unitPrice = lineUnitPrice(line);
  // The ceiling the stepper offers is the shelf, so raising a line past what is
  // left is simply not on offer. `exceedsStock` can then only come from stock
  // falling under a quantity already stored — which is what the note explains.
  const maxQuantity = lineCeiling(product?.stock);

  return (
    <li
      className={cn(
        "flex gap-4 rounded-[20px] p-4",
        // A row that stops checkout gets a wash the others don't: the summary
        // only says "one of these", and in a long cart the tint is what turns
        // that into a row the eye can find.
        shipsNothing ? "bg-danger-soft" : "bg-surface-sunken",
      )}
    >
      <div
        className={cn(
          "bg-surface-muted relative size-24 shrink-0 overflow-hidden rounded-[14px]",
          shipsNothing && "opacity-55",
        )}
      >
        {product?.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="text-fg-faint flex size-full items-center justify-center text-[9px] tracking-wide uppercase">
            {t("noImage")}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {product && (
          <span className="text-accent-readable text-[10px] tracking-wide uppercase">
            {product.category}
          </span>
        )}

        {/* A product that has left the catalog has no page to link to, and one
            that is merely deactivated has a page that 404s — so the name is a
            link only while the product is something a customer can still open. */}
        {product && product.isAvailable ? (
          <Link
            href={`/products/${product.slug}`}
            className="text-fg text-subhead hover:text-accent-readable focus-visible:outline-accent-readable rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {product.name}
          </Link>
        ) : (
          // Not a heading: an available line's name is a link, not a heading, so
          // an <h3> here made the one unavailable line the only heading between
          // the page's <h1> and the summary's <h2>.
          <p className="text-fg text-subhead">{product?.name ?? t("issue.goneProduct")}</p>
        )}

        {issue && (
          <p className={cn("text-xs font-semibold", NOTE_TONE[issue])}>
            {issue === "exceedsStock"
              ? t("issue.exceedsStock", { available: product?.stock ?? 0 })
              : issue === "priceChanged"
                ? t("issue.priceChanged", { price: formatPrice(unitPrice) })
                : t(`issue.${issue}`)}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          {shipsNothing ? (
            <span className="text-fg-subtle text-xs">{t("quantityAsked", { quantity })}</span>
          ) : (
            <QuantityStepper
              value={quantity}
              onDecrease={onDecrease}
              onIncrease={onIncrease}
              max={maxQuantity}
              size="sm"
            />
          )}

          {/* What this line adds to the summary, never a figure the customer has
              to reconstruct. The multiplication above it is printed whenever it
              is not simply the unit price — which is also how a line shipping
              less than was asked for shows the quantity its money is for. */}
          <div className="ms-auto text-end">
            {shipsNothing ? (
              <span className="text-fg-subtle text-xs font-semibold">{t("notIncluded")}</span>
            ) : (
              <>
                {orderableQuantity > 1 && (
                  <span className="text-fg-subtle block text-xs">
                    {orderableQuantity} × {formatPrice(unitPrice)}
                  </span>
                )}
                <span className="text-fg block text-[16px] font-extrabold">
                  {formatPrice(line.lineTotal)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label={product ? t("removeNamed", { name: product.name }) : t("removeItem")}
        onClick={onRemove}
        className="hover:text-danger focus-visible:outline-accent-readable text-fg-subtle flex size-7 shrink-0 items-center justify-center self-start rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <CloseIcon className="size-4" />
      </button>
    </li>
  );
}
