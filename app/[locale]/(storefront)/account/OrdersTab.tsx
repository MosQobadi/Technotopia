"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/storefront/ui/EmptyState";
import { OrderStatusBadge } from "@/components/storefront/ui/StatusBadge";
import { formatOrderNumber, formatPrice } from "@/lib/format";
import type { OrderHistoryItem } from "@/server/order.service";

interface OrdersTabProps {
  orders: OrderHistoryItem[];
}

export function OrdersTab({ orders }: OrdersTabProps) {
  const t = useTranslations("account.orders");
  const tCommon = useTranslations("common");

  if (orders.length === 0) {
    return (
      <EmptyState
        message={t("empty")}
        actionLabel={tCommon("browseProducts")}
        actionHref="/products"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-surface-sunken flex flex-wrap items-center justify-between gap-2.5 rounded-[20px] px-5 py-4.5"
        >
          <div>
            <div className="mb-1 text-xs text-fg-subtle">
              <span className="font-mono" dir="ltr">
                {formatOrderNumber(order.id)}
              </span>{" "}
              ·{" "}
              {format(order.createdAt, "MMM d, yyyy")}
            </div>
            <div className="text-fg text-sm font-semibold">{order.itemsSummary}</div>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="text-fg text-[15px] font-extrabold">
              {formatPrice(order.total)}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
