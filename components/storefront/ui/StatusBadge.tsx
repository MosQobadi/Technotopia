"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { OrderStatus } from "@/lib/generated/prisma/enums";

// Stock status and order status are visually distinct (dot+mono text vs. a solid pill)
// and are never interchangeable, so they're kept as two separate components rather
// than one component with a "type" switch.

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

const STOCK_STATUS_CONFIG: Record<
  StockStatus,
  { key: "inStock" | "lowStock" | "outOfStock"; text: string; bg: string }
> = {
  "in-stock": { key: "inStock", text: "text-success", bg: "bg-success" },
  "low-stock": { key: "lowStock", text: "text-warning", bg: "bg-warning" },
  "out-of-stock": { key: "outOfStock", text: "text-error", bg: "bg-error" },
};

interface StockStatusBadgeProps {
  status: StockStatus;
  /** "inline" = colored dot + mono text (product detail). "pill" = white pill, no dot (product card badge). */
  variant?: "inline" | "pill";
  className?: string;
}

export function StockStatusBadge({ status, variant = "inline", className }: StockStatusBadgeProps) {
  const t = useTranslations("common.stockStatus");
  const { key, text, bg } = STOCK_STATUS_CONFIG[status];
  const label = t(key).toUpperCase();

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "rounded-full bg-white px-2.5 py-1 font-mono text-[10px] font-bold",
          text,
          className,
        )}
      >
        {label}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.75 shrink-0 rounded-full", bg)} aria-hidden />
      <span className={cn("font-mono text-xs", text)}>{label}</span>
    </span>
  );
}

// Keyed by the real OrderStatus enum (not the display label) so the style lookup
// stays stable across locales — the translated label is looked up separately.
const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "text-gray-500",
  [OrderStatus.SENDING]: "text-warning",
  [OrderStatus.SENT]: "text-accent",
  [OrderStatus.DELIVERED]: "text-success",
  [OrderStatus.CANCELLED]: "text-error",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const t = useTranslations("common.orderStatus");

  return (
    <span
      className={cn(
        "rounded-full bg-white px-3 py-1 font-mono text-[11px] font-bold",
        ORDER_STATUS_CLASSES[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
