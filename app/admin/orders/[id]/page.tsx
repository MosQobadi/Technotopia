"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { OrderDetails, type OrderDetailData } from "../OrderDetails";

interface OrderApiResponse {
  success: boolean;
  data?: OrderDetailData;
  error?: string;
}

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/orders/${id}`);
        const result: OrderApiResponse = await response.json();
        if (cancelled) return;
        if (!result.success || !result.data) {
          setError(result.error ?? "Failed to load order.");
          return;
        }
        setOrder(result.data);
      } catch {
        if (!cancelled) setError("Failed to load order.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!order) return <p className="text-muted text-sm">Loading order...</p>;

  return <OrderDetails order={order} onOrderChange={setOrder} />;
}
