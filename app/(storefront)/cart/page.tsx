"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useAuthStore } from "@/lib/store/auth";
import { useCartStore, type CartItem } from "@/lib/store/cart";
import { Button } from "@/components/storefront/ui/Button";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const shipping = useCartStore((state) => state.shipping);
  const total = useCartStore((state) => state.total);
  const cartLoading = useCartStore((state) => state.isLoading);
  const hydrateCart = useCartStore((state) => state.hydrate);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (user) hydrateCart();
  }, [user, hydrateCart]);

  const showLoggedOut = !authLoading && !user;
  const showEmpty = !authLoading && !!user && !cartLoading && items.length === 0;
  const showCart = !authLoading && !!user && (cartLoading || items.length > 0);

  return (
    <main className="mx-auto max-w-250 px-6 py-10 pb-24">
      <h1 className="mb-8 text-[32px] font-extrabold tracking-tight text-ink-900">Your Cart</h1>

      {showLoggedOut && (
        <EmptyState message="Log in to view your cart." actionLabel="Log In" actionHref="/login" />
      )}

      {showEmpty && (
        <EmptyState message="Your cart is empty." actionLabel="Browse products" actionHref="/products" />
      )}

      {showCart && items.length > 0 && (
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>

          <div className="bg-surface-100 sticky top-22 rounded-[20px] p-6">
            <h2 className="mb-5 text-[17px] font-bold text-ink-900">Order Summary</h2>
            <div className="mb-2.5 flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mb-4 flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span>{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
            </div>
            <div className="mb-6 flex justify-between border-t border-gray-200 pt-4 text-lg font-extrabold text-ink-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Button variant="primary" href="/checkout" fullWidth>
              Checkout →
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

interface CartLineProps {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

function CartLine({ item, onDecrease, onIncrease, onRemove }: CartLineProps) {
  return (
    <div className="bg-surface-100 flex gap-4 rounded-[20px] p-4">
      <div className="bg-surface-200 relative size-24 shrink-0 overflow-hidden rounded-[14px]">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-mono text-[9px] text-gray-500">
            PHOTO
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-accent font-mono text-[10px] tracking-wide uppercase">
          {item.category}
        </span>
        <h3 className="text-[15px] font-bold text-ink-900">{item.name}</h3>
        <div className="mt-1.5 flex items-center justify-between">
          <QuantityStepper value={item.quantity} onDecrease={onDecrease} onIncrease={onIncrease} size="sm" />
          <span className="text-[16px] font-extrabold text-ink-900">{formatPrice(item.lineTotal)}</span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Remove item"
        onClick={onRemove}
        className="hover:text-error flex size-7 shrink-0 items-center justify-center self-start rounded-full text-sm text-gray-500 outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        ✕
      </button>
    </div>
  );
}
