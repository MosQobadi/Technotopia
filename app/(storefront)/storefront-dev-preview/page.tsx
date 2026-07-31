"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/storefront/ui/Button";
import { PriceTag } from "@/components/storefront/ui/PriceTag";
import { SectionEyebrow } from "@/components/storefront/ui/SectionEyebrow";
import { StockStatusBadge, OrderStatusBadge } from "@/components/storefront/ui/StatusBadge";
import { Tabs } from "@/components/storefront/ui/Tabs";
import { QuantityStepper } from "@/components/storefront/ui/QuantityStepper";
import { Breadcrumb } from "@/components/storefront/ui/Breadcrumb";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { ProductCard } from "@/components/storefront/ui/ProductCard";

export default function StorefrontDevPreviewPage() {
  const [tab, setTab] = useState("profile");
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-2xl">Storefront UI Primitives Preview</h1>
        <p className="text-sm text-gray-500">
          Temporary page to confirm the storefront design tokens and shared UI primitives
          (Task 15.5) — remove once confirmed.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Add to Cart</Button>
          <Button variant="secondary">View Details</Button>
          <Button variant="accent-outline">Learn More</Button>
          <Button variant="icon-circle" aria-label="Wishlist">
            ♡
          </Button>
          <Button variant="disabled">Out of Stock</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Price tag</h2>
        <div className="flex flex-wrap items-center gap-8">
          <PriceTag price={12_400_000} originalPrice={15_500_000} />
          <PriceTag price={8_900_000} inStock />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Section eyebrow</h2>
        <SectionEyebrow label="Best Sellers" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Status badges</h2>
        <div className="flex flex-wrap items-center gap-6">
          <StockStatusBadge status="in-stock" />
          <StockStatusBadge status="low-stock" />
          <StockStatusBadge status="out-of-stock" />
          <StockStatusBadge status="low-stock" variant="pill" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OrderStatusBadge status="Delivered" />
          <OrderStatusBadge status="Shipped" />
          <OrderStatusBadge status="Processing" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Tabs</h2>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "profile", label: "Profile" },
            { key: "orders", label: "Order History" },
            { key: "addresses", label: "Addresses" },
          ]}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">
          Quantity stepper
        </h2>
        <QuantityStepper
          value={qty}
          onDecrease={() => setQty((q) => Math.max(1, q - 1))}
          onIncrease={() => setQty((q) => q + 1)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Breadcrumb</h2>
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Microphones", href: "/products" }, { label: "Cardio X2 Condenser Mic" }]} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Empty state</h2>
        <EmptyState message="Your cart is empty." actionLabel="Browse products" actionHref="/products" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">Product card</h2>
        <div className="grid grid-cols-3 gap-5">
          <ProductCard
            href="/products/cardio-x2"
            category="Microphones"
            name="Cardio X2 Condenser Mic"
            price={4_200_000}
            originalPrice={5_250_000}
            badge={{ kind: "discount", label: "-20%" }}
            isWishlisted={wishlisted}
            onToggleWishlist={() => setWishlisted((w) => !w)}
          />
          <ProductCard
            href="/products/lavpro"
            category="Microphones"
            name="LavPro Wireless Duo"
            price={5_600_000}
            badge={{ kind: "status", label: "OUT OF STOCK", tone: "error" }}
          />
          <ProductCard
            href="/products/halo-60"
            category="Lights"
            name="Halo 60 LED Panel"
            price={6_800_000}
            badge={{ kind: "rank", label: "#3 SOLD" }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-wide text-gray-500 uppercase">
          Raw price format check
        </h2>
        <span className="font-mono text-xs text-gray-500">{formatPrice(1234500)}</span>
      </section>
    </main>
  );
}
