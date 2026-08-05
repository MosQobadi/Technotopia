"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { OrderStatusBadge } from "@/components/storefront/ui/StatusBadge";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/generated/prisma/enums";

interface OrderHistoryRow {
  id: string;
  itemsSummary: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export function OrdersTab() {
  const t = useTranslations("account.orders");
  const [orders, setOrders] = useState<OrderHistoryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/storefront/orders")
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result.success) setOrders(result.data);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (orders === null) return null;

  if (orders.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-surface-100 flex flex-wrap items-center justify-between gap-2.5 rounded-[20px] px-5 py-4.5"
        >
          <div>
            <div className="mb-1 font-mono text-xs text-gray-500">
              #{order.id.slice(-8).toUpperCase()} ·{" "}
              {format(new Date(order.createdAt), "MMM d, yyyy")}
            </div>
            <div className="text-ink-900 text-sm font-semibold">{order.itemsSummary}</div>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="text-ink-900 text-[15px] font-extrabold">
              {formatPrice(order.total)}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
