import { cn } from "@/lib/cn";

// Stock status and order status are visually distinct (dot+mono text vs. a solid pill)
// and are never interchangeable, so they're kept as two separate components rather
// than one component with a "type" switch.

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

const STOCK_STATUS_CONFIG: Record<StockStatus, { label: string; text: string; bg: string }> = {
  "in-stock": { label: "IN STOCK", text: "text-success", bg: "bg-success" },
  "low-stock": { label: "LOW STOCK", text: "text-warning", bg: "bg-warning" },
  "out-of-stock": { label: "OUT OF STOCK", text: "text-error", bg: "bg-error" },
};

interface StockStatusBadgeProps {
  status: StockStatus;
  /** "inline" = colored dot + mono text (product detail). "pill" = white pill, no dot (product card badge). */
  variant?: "inline" | "pill";
  className?: string;
}

export function StockStatusBadge({ status, variant = "inline", className }: StockStatusBadgeProps) {
  const { label, text, bg } = STOCK_STATUS_CONFIG[status];

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

// Covers every real Order.status value, not just the three the wireframe mock happens to show.
type OrderStatus = "Order Placed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  "Order Placed": "text-gray-500",
  Processing: "text-warning",
  Shipped: "text-accent",
  Delivered: "text-success",
  Cancelled: "text-error",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full bg-white px-3 py-1 font-mono text-[11px] font-bold",
        ORDER_STATUS_CLASSES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
