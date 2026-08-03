"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { OrderStatusBadge } from "@/components/storefront/ui/StatusBadge";
import { formatPrice } from "@/lib/format";
import { OrderStatus } from "@/lib/generated/prisma/enums";

// Same labels the order tracking page uses for these statuses, kept in sync by convention.
const ORDER_STATUS_LABELS: Record<OrderStatus, "Order Placed" | "Processing" | "Shipped" | "Delivered" | "Cancelled"> = {
  [OrderStatus.PENDING]: "Order Placed",
  [OrderStatus.SENDING]: "Processing",
  [OrderStatus.SENT]: "Shipped",
  [OrderStatus.DELIVERED]: "Delivered",
  [OrderStatus.CANCELLED]: "Cancelled",
};

interface OrderHistoryRow {
  id: string;
  itemsSummary: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export function OrdersTab() {
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
    return <p className="text-sm text-gray-500">You haven&apos;t placed any orders yet.</p>;
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
              #{order.id.slice(-8).toUpperCase()} · {format(new Date(order.createdAt), "MMM d, yyyy")}
            </div>
            <div className="text-sm font-semibold text-ink-900">{order.itemsSummary}</div>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="text-[15px] font-extrabold text-ink-900">{formatPrice(order.total)}</span>
            <OrderStatusBadge status={ORDER_STATUS_LABELS[order.status]} />
          </div>
        </div>
      ))}
    </div>
  );
}
