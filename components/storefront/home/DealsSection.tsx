"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { HomeProductView } from "@/types/home";
import { ProductCard } from "@/components/storefront/ui/ProductCard";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistHydration, useWishlistStore } from "@/lib/store/wishlist";

// How much of the visible width one arrow press travels. Just under a full
// screenful, so a card stays half-visible as a hint that the rail continues.
const SCROLL_RATIO = 0.85;

// The heading names the whole section, so the rail inside it needs no label of
// its own — a screen reader announces the region on the way in.
const HEADING_ID = "deals-heading";

// The shelf directly under the hero: everything currently marked down, deepest
// cut first. A rail rather than a grid because it is a taster, not the catalog
// — and because it is the one section a visitor can shop without having decided
// anything yet, so it should read in one sweep instead of one screenful.
//
// The sliding is a native scroll container with CSS scroll-snap, never a
// transform and never a carousel library. That hands touch, trackpad, keyboard
// focus, RTL and reduced motion to the browser: tabbing from card to card
// scrolls the rail because the browser scrolls a focused element into view, and
// nothing here has to reimplement that. The arrows only exist because the
// scrollbar is hidden, which leaves a mouse without one.
export function DealsSection({ products }: { products: HomeProductView[] }) {
  const t = useTranslations("home.deals");
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const addCartItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isWishlisted = useWishlistStore((state) => state.isWishlisted);

  // The hearts are this section's own concern, so is the list behind them.
  useWishlistHydration();

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    // An RTL container scrolls into negative scrollLeft in every browser that
    // matters now, so the distance travelled is the absolute value either way.
    const travelled = Math.abs(track.scrollLeft);
    const max = track.scrollWidth - track.clientWidth;
    setAtStart(travelled <= 1);
    setAtEnd(travelled >= max - 1);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    // A resize changes how much of the rail fits, and so whether it overflows
    // at all — which is what retires the arrows on a wide screen.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  function scrollByPage(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    // "Further along the rail" is a negative scrollLeft delta when the reading
    // direction is RTL, so the direction the arrow points is not the sign.
    const sign = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    // No `behavior` here: whether the travel is animated is the track's
    // `motion-safe:scroll-smooth` to decide, so the arrows and the browser's
    // own focus scrolling glide or jump together.
    track.scrollBy({ left: direction * sign * track.clientWidth * SCROLL_RATIO });
  }

  // A shop with nothing on offer shouldn't announce it: no rail, no empty
  // state, no heading over four inches of nothing.
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={HEADING_ID} className="mx-auto max-w-320 px-6 pt-14 pb-2">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <SectionEyebrow label={t("eyebrow")} />
          <h2 id={HEADING_ID} className="text-fg text-title">
            {t("heading")}
          </h2>
        </div>

        {/* Hidden from assistive tech: the rail is a list a screen reader walks
            item by item, and these only move the viewport over cards that are
            in the DOM either way. */}
        <div aria-hidden className="hidden items-center gap-2 sm:flex">
          <RailArrow onClick={() => scrollByPage(-1)} disabled={atStart} back />
          <RailArrow onClick={() => scrollByPage(1)} disabled={atEnd} />
        </div>
      </div>

      <ul
        ref={trackRef}
        onScroll={measure}
        // `overflow-x: auto` makes the block axis a scrollport too, so the
        // vertical padding is what stops the card's hover lift being clipped
        // off the top of the track.
        //
        // `motion-safe:` rather than a bare `scroll-smooth`: this one property
        // animates every scroll the track makes, including the one the browser
        // performs when a keyboard tabs onto an off-screen card, so leaving it
        // unconditional would animate the rail for someone who asked the OS for
        // no animation. Same stance HeroRotator takes on auto-advance.
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto py-2 motion-safe:scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => {
          // Every product here is discounted by construction, so the badge is
          // derived from the pair the card already reads rather than carrying a
          // percentage of its own.
          const discountPercent = product.originalPrice
            ? Math.round((1 - product.price / product.originalPrice) * 100)
            : 0;

          return (
            <li
              key={product.id}
              className="w-[74vw] max-w-70 min-w-42 flex-none snap-start sm:w-[42vw] lg:w-[23%]"
            >
              <ProductCard
                href={`/products/${product.slug}`}
                category={product.category}
                name={product.name}
                price={product.price}
                originalPrice={product.originalPrice}
                imageSrc={product.image ?? undefined}
                badge={{ kind: "discount", label: `-${discountPercent}%` }}
                isWishlisted={isWishlisted(product.id)}
                onToggleWishlist={() => toggleWishlist(product.id)}
                onAddToCart={() => addCartItem(product.id)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RailArrow({
  onClick,
  disabled,
  back,
}: {
  onClick: () => void;
  disabled: boolean;
  back?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
      className="border-line text-fg-muted hover:border-accent-readable hover:text-accent-readable flex size-9 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-35"
    >
      {/* The glyph turns around with the reading direction; the button does not. */}
      <span aria-hidden className="rtl:-scale-x-100">
        {back ? "←" : "→"}
      </span>
    </button>
  );
}
