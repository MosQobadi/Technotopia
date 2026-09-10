"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { OrderReceipt } from "@/components/storefront/checkout/OrderReceipt";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { useReceiptStore } from "@/lib/store/receipt";

export function GuestReceiptContent() {
  const t = useTranslations("orders.confirmation");
  const tCommon = useTranslations("common");

  const receipt = useReceiptStore((state) => state.receipt);
  const hasHydrated = useReceiptStore((state) => state.hasHydrated);
  const hydrate = useReceiptStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // The server has no sessionStorage, so the first client render has to match
  // an empty one. Reading it back takes a tick, and a blank tick is better than
  // flashing "there's no receipt here" in front of the receipt.
  if (!hasHydrated) return null;

  if (!receipt) {
    return (
      <main className="mx-auto max-w-250 px-6 py-10 pb-24">
        <EmptyState
          message={t("missing")}
          actionLabel={tCommon("browseProducts")}
          actionHref="/products"
        />
      </main>
    );
  }

  return <OrderReceipt orderId={receipt.id} total={receipt.total} isGuest />;
}
